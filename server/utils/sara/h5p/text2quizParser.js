/**
 * Parse un bloc ```quiz text2quiz en objets question structurés.
 * Format d'entrée (mirroir de frontend/QuizBlock/parser.js) :
 *   QCM || question || opt1 | V: bonne | opt3 || explication
 *   VF  || affirmation || V || explication          (ou F)
 *   QRC || question || bonne réponse || explication
 * Suffixes optionnels (ordre libre) : HINT: ..., OK: ..., KO: ...
 * Tokens médias dans les slots : [img:URI], [tts:texte], [audio:URL], [video:URL]
 *   (les tokens sont strippés du texte exporté en H5P puisque H5P ne les rend pas)
 * Retourne { questions: [...], competence: string }.
 * Types non supportés côté H5P V1 (Trous, Association, etc.) : silencieusement ignorés.
 */

const H5P_SUPPORTED = new Set(["QCM", "VF", "QRC"]);

const MEDIA_TOKEN_RE = /\[(img|tts|audio|video):[^\]]+\]/g;

function stripMediaTokens(s) {
  if (!s) return s;
  return String(s).replace(MEDIA_TOKEN_RE, "").replace(/\s+/g, " ").trim();
}

function splitParts(line) {
  return line.split(" || ").map((s) => s.trim());
}

function extractAnswerMeta(raw) {
  // Tolérance LLM : "FEEDBACK:OK:" / "FEEDBACK_OK:" → "OK:"
  const text = String(raw).replace(/\bFEEDBACK[:_-]?(OK|KO):\s*/gi, "$1: ");
  const re = /(^|\s)(OK|KO):\s*/i;
  const m = text.match(re);
  if (!m) return { text: text.trim(), feedback_ok: null, feedback_ko: null };
  const cutAt = m.index + m[1].length;
  const main = text.slice(0, cutAt).trim();
  const metaStr = text.slice(cutAt);
  let feedback_ok = null;
  let feedback_ko = null;
  const parts = metaStr.split(/\s+(?=(?:OK|KO):)/i);
  for (const p of parts) {
    const mm = p.match(/^(OK|KO):\s*([\s\S]*)$/i);
    if (!mm) continue;
    if (mm[1].toUpperCase() === "OK") feedback_ok = mm[2].trim() || null;
    else feedback_ko = mm[2].trim() || null;
  }
  return { text: main, feedback_ok, feedback_ko };
}

function normalizeMetaPrefix(s) {
  return String(s)
    .replace(/^FEEDBACK[:_-]?(OK|KO):\s*/i, "$1: ")
    .replace(/^INDICE:\s*/i, "HINT: ");
}

function splitOnPipeIfMeta(part) {
  const norm = normalizeMetaPrefix(part);
  if (!/^(HINT|OK|KO):/i.test(norm)) return [part];
  return norm.split(/\s\|\s(?=(?:HINT|OK|KO|FEEDBACK):)/i);
}

function parseAnswers(raw) {
  return raw.split("|").map((a) => {
    let t = a.trim();
    let correct = false;
    if (/^V:/i.test(t)) {
      correct = true;
      t = t.replace(/^V:/i, "").trim();
    }
    const meta = extractAnswerMeta(t);
    return {
      text: stripMediaTokens(meta.text),
      correct,
      feedback_ok: stripMediaTokens(meta.feedback_ok) || null,
      feedback_ko: stripMediaTokens(meta.feedback_ko) || null,
    };
  });
}

function extractQuestionMeta(parts, fromIdx) {
  let hint = null;
  let feedback_ok = null;
  let feedback_ko = null;
  let explication = null;
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
      else if (!explication) explication = raw;
    }
  }
  return {
    hint: stripMediaTokens(hint) || null,
    feedback_ok: stripMediaTokens(feedback_ok) || null,
    feedback_ko: stripMediaTokens(feedback_ko) || null,
    explication: stripMediaTokens(explication) || null,
  };
}

const PARSERS = {
  QCM: (parts) => ({
    type: "QCM",
    question: stripMediaTokens(parts[1]),
    answers: parseAnswers(parts[2] || ""),
    ...extractQuestionMeta(parts, 3),
  }),
  VF: (parts) => ({
    type: "VF",
    question: stripMediaTokens(parts[1]),
    correct: (parts[2] || "").trim().toUpperCase() === "V",
    ...extractQuestionMeta(parts, 3),
  }),
  QRC: (parts) => ({
    type: "QRC",
    question: stripMediaTokens(parts[1]),
    answer: stripMediaTokens(parts[2]) || "",
    ...extractQuestionMeta(parts, 3),
  }),
};

function extractQuizBlock(text) {
  const match = text.match(/```quiz\s*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

function parseText2Quiz(rawOrFullText) {
  const raw = rawOrFullText.includes("```quiz")
    ? extractQuizBlock(rawOrFullText)
    : rawOrFullText;
  if (!raw) return { questions: [], competence: "" };

  const questions = [];
  let competence = "";

  for (const line of raw.trim().split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^competence\s*:/i.test(trimmed)) {
      competence = trimmed.replace(/^competence\s*:/i, "").trim();
      continue;
    }
    const type = trimmed.split(" || ")[0].trim();
    if (!H5P_SUPPORTED.has(type)) continue;
    try {
      const q = PARSERS[type](splitParts(trimmed));
      if (q.question) questions.push(q);
    } catch {
      // skip malformed
    }
  }

  return { questions, competence };
}

module.exports = {
  parseText2Quiz,
  extractQuizBlock,
  stripMediaTokens,
  H5P_SUPPORTED,
};
