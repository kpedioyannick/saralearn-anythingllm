function splitParts(line) {
  return line.split(" || ").map((s) => s.trim());
}

function parseAnswers(raw) {
  return raw.split("|").map((a) => {
    const t = a.trim();
    if (t.startsWith("V:")) return { text: t.slice(2).trim(), correct: true };
    return { text: t, correct: false };
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
    explication: parts[3] || null,
  }),
  VF: (parts) => ({
    type: "VF",
    question: parts[1],
    correct: parts[2] === "V",
    explication: parts[3] || null,
  }),
  QR: (parts) => ({
    type: "QR",
    question: parts[1],
    expected: parts[2] || "",
    explication: parts[3] || null,
  }),
  Flashcard: (parts) => ({
    type: "Flashcard",
    front: parts[1],
    back: parts[2],
  }),
  QRC: (parts) => ({
    type: "QRC",
    question: parts[1],
    answer: parts[2] || "",
    explication: parts[3] || null,
  }),
  Trous: (parts) => {
    const raw = parts[1];
    const blanks = parseBraces(raw);
    const segments = raw.split(/\{\{.+?\}\}/);
    return { type: "Trous", segments, blanks };
  },
  TrousRC: (parts) => {
    const raw = parts[1];
    const blanks = parseBraces(raw);
    const segments = raw.split(/\{\{.+?\}\}/);
    return { type: "TrousRC", segments, blanks };
  },
  Ordre: (parts) => ({
    type: "Ordre",
    items: parts[1].split("|").map((s) => s.trim()),
  }),
  Etiquettes: (parts) => {
    const raw = parts[1];
    const labels = parseBraces(parts[2] || "");
    const blanks = parseBraces(raw);
    const segments = raw.split(/\{\{.+?\}\}/);
    return { type: "Etiquettes", segments, blanks, labels };
  },
  Association: (parts) => ({
    type: "Association",
    pairs: parsePairs(parts[1]),
  }),
  Correspondance: (parts) => ({
    type: "Correspondance",
    title: parts[1],
    pairs: parsePairs(parts[2]),
  }),
};

export function parseQuiz(raw) {
  const questions = [];
  let competence = "";
  for (const line of raw.trim().split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase().startsWith("competence:")) {
      competence = trimmed.slice(11).trim();
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
  return { questions, competence };
}
