import { extractMeta } from "./tokenizer";

function splitParts(line) {
  return line.split(" || ").map((s) => s.trim());
}

function normalizeMetaPrefix(s) {
  // Tolère "FEEDBACK:OK:" / "FEEDBACK_OK:" / "INDICE:" → marqueurs canoniques
  return String(s)
    .replace(/^FEEDBACK[:_-]?(OK|KO):\s*/i, "$1: ")
    .replace(/^INDICE:\s*/i, "HINT: ");
}

function splitOnPipeIfMeta(part) {
  // Sara peut écrire "OK: ... | KO: ..." (1 pipe au lieu de ||).
  // On les ré-éclate seulement si la part contient déjà un préfixe meta.
  const norm = normalizeMetaPrefix(part);
  if (!/^(HINT|OK|KO):/i.test(norm)) return [part];
  return norm.split(/\s\|\s(?=(?:HINT|OK|KO|FEEDBACK):)/i);
}

function extractQuestionMeta(parts, fromIdx) {
  let hint = null;
  let feedback_ok = null;
  let feedback_ko = null;
  const remaining = [];
  for (let i = fromIdx; i < parts.length; i++) {
    const sub = splitOnPipeIfMeta(parts[i]);
    for (const raw of sub) {
      const p = normalizeMetaPrefix(raw);
      if (/^HINT:\s*/i.test(p))
        hint = p.replace(/^HINT:\s*/i, "").trim() || null;
      else if (/^OK:\s*/i.test(p))
        feedback_ok = p.replace(/^OK:\s*/i, "").trim() || null;
      else if (/^KO:\s*/i.test(p))
        feedback_ko = p.replace(/^KO:\s*/i, "").trim() || null;
      else remaining.push(raw);
    }
  }
  return { hint, feedback_ok, feedback_ko, explication: remaining[0] || null };
}

function parseAnswers(raw) {
  return raw.split("|").map((a) => {
    let t = a.trim();
    let correct = false;
    if (t.startsWith("V:")) {
      correct = true;
      t = t.slice(2).trim();
    }
    const meta = extractMeta(t);
    return {
      text: meta.text,
      correct,
      feedback_ok: meta.feedback_ok,
      feedback_ko: meta.feedback_ko,
    };
  });
}

function parseBraces(raw) {
  const matches = [];
  const re = /\{\{(.+?)\}\}/g;
  let m;
  while ((m = re.exec(raw)) !== null) matches.push(m[1]);
  return matches;
}

function parsePairs(raw) {
  return parseBraces(raw).map((item) => {
    const [left, right] = item.split("::").map((s) => s.trim());
    return { left, right };
  });
}

const PARSERS = {
  QCM: (parts) => ({
    type: "QCM",
    question: parts[1],
    answers: parseAnswers(parts[2]),
    ...extractQuestionMeta(parts, 3),
  }),
  VF: (parts) => ({
    type: "VF",
    question: parts[1],
    correct: parts[2] === "V",
    ...extractQuestionMeta(parts, 3),
  }),
  QR: (parts) => ({
    type: "QR",
    question: parts[1],
    expected: parts[2] || "",
    ...extractQuestionMeta(parts, 3),
  }),
  Flashcard: (parts) => ({
    type: "Flashcard",
    front: parts[1],
    back: parts[2],
    ...extractQuestionMeta(parts, 3),
  }),
  QRC: (parts) => ({
    type: "QRC",
    question: parts[1],
    answer: parts[2] || "",
    ...extractQuestionMeta(parts, 3),
  }),
  Trous: (parts) => {
    const raw = parts[1];
    const blanks = parseBraces(raw);
    const segments = raw.split(/\{\{.+?\}\}/);
    return {
      type: "Trous",
      segments,
      blanks,
      ...extractQuestionMeta(parts, 2),
    };
  },
  TrousRC: (parts) => {
    const raw = parts[1];
    const blanks = parseBraces(raw);
    const segments = raw.split(/\{\{.+?\}\}/);
    return {
      type: "TrousRC",
      segments,
      blanks,
      ...extractQuestionMeta(parts, 2),
    };
  },
  Ordre: (parts) => ({
    type: "Ordre",
    items: parts[1].split("|").map((s) => s.trim()),
    ...extractQuestionMeta(parts, 2),
  }),
  Etiquettes: (parts) => {
    const raw = parts[1];
    const labels = parseBraces(parts[2] || "");
    const blanks = parseBraces(raw);
    const segments = raw.split(/\{\{.+?\}\}/);
    return {
      type: "Etiquettes",
      segments,
      blanks,
      labels,
      ...extractQuestionMeta(parts, 3),
    };
  },
  Association: (parts) => ({
    type: "Association",
    pairs: parsePairs(parts[1]),
    ...extractQuestionMeta(parts, 2),
  }),
  Correspondance: (parts) => ({
    type: "Correspondance",
    title: parts[1],
    pairs: parsePairs(parts[2]),
    ...extractQuestionMeta(parts, 3),
  }),
};

export function parseQuiz(raw) {
  const questions = [];
  let competence = "";
  let objective = "";
  for (const line of raw.trim().split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase().startsWith("competence:")) {
      competence = trimmed.slice(11).trim();
      continue;
    }
    if (trimmed.toLowerCase().startsWith("objective:")) {
      objective = trimmed.slice(10).trim();
      continue;
    }
    const type = trimmed.split(" || ")[0].trim();
    const parser = PARSERS[type];
    if (parser) {
      try {
        questions.push(parser(splitParts(trimmed)));
      } catch {
        // skip malformed lines
      }
    }
  }
  return { questions, competence, objective };
}
