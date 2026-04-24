/**
 * Parse un bloc ```quiz text2quiz en objets question structurés.
 * Format d'entrée (mirroir de frontend/QuizBlock/parser.js) :
 *   QCM || question || opt1 | V: bonne | opt3 || explication
 *   VF  || affirmation || V || explication          (ou F)
 *   QRC || question || bonne réponse || explication
 * Retourne { questions: [...], competence: string }.
 * Types non supportés côté H5P V1 (Trous, Association, etc.) : silencieusement ignorés.
 */

const H5P_SUPPORTED = new Set(["QCM", "VF", "QRC"]);

function splitParts(line) {
  return line.split(" || ").map((s) => s.trim());
}

function parseAnswers(raw) {
  return raw.split("|").map((a) => {
    const t = a.trim();
    if (/^V:/i.test(t)) return { text: t.replace(/^V:/i, "").trim(), correct: true };
    return { text: t, correct: false };
  });
}

const PARSERS = {
  QCM: (parts) => ({
    type: "QCM",
    question: parts[1],
    answers: parseAnswers(parts[2] || ""),
    explication: parts[3] || null,
  }),
  VF: (parts) => ({
    type: "VF",
    question: parts[1],
    correct: (parts[2] || "").trim().toUpperCase() === "V",
    explication: parts[3] || null,
  }),
  QRC: (parts) => ({
    type: "QRC",
    question: parts[1],
    answer: parts[2] || "",
    explication: parts[3] || null,
  }),
};

function extractQuizBlock(text) {
  const match = text.match(/```quiz\s*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

function parseText2Quiz(rawOrFullText) {
  // Accepte soit le contenu brut du bloc, soit un message complet ```quiz ... ```
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

module.exports = { parseText2Quiz, extractQuizBlock, H5P_SUPPORTED };
