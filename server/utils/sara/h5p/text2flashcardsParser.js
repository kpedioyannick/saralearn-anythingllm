/**
 * Parse un bloc ```flashcards en payload pour /api/generate-flashcards.php.
 * Format LLM attendu :
 *   ```flashcards
 *   title: ...
 *   language: fr
 *   description: ... (optionnel)
 *
 *   Q: question/recto || R: réponse/verso || tip: indice optionnel
 *   Q: question 2 || R: réponse 2
 *   ```
 * Retour : { title, language, description, cards: [{ text, answer, tip? }] }
 */

function extractFlashcardsBlock(text) {
  const match = text.match(/```flashcards\s*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

function parseLine(line) {
  // Sépare par " || " puis pour chaque part trouve "Q:", "R:", "tip:".
  const parts = line.split(" || ").map((s) => s.trim());
  const card = {};
  for (const p of parts) {
    const m = p.match(/^(Q|R|tip)\s*:\s*([\s\S]*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "q") card.text = val;
    else if (key === "r") card.answer = val;
    else if (key === "tip") card.tip = val;
  }
  return card.text && card.answer ? card : null;
}

function parseText2Flashcards(rawOrFullText) {
  const raw = rawOrFullText.includes("```flashcards")
    ? extractFlashcardsBlock(rawOrFullText)
    : rawOrFullText;
  if (!raw) return { title: "", language: "fr", description: "", cards: [] };

  const lines = raw.split(/\r?\n/);
  let title = "";
  let language = "fr";
  let description = "";
  const cards = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^title\s*:/i.test(t) && cards.length === 0) {
      title = t.replace(/^title\s*:/i, "").trim();
      continue;
    }
    if (/^language\s*:/i.test(t) && cards.length === 0) {
      language = t.replace(/^language\s*:/i, "").trim() || "fr";
      continue;
    }
    if (/^description\s*:/i.test(t) && cards.length === 0) {
      description = t.replace(/^description\s*:/i, "").trim();
      continue;
    }
    if (/^Q\s*:/i.test(t)) {
      const c = parseLine(t);
      if (c) cards.push(c);
    }
  }

  return { title, language, description, cards };
}

module.exports = { parseText2Flashcards, extractFlashcardsBlock };
