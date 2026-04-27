/**
 * Parse un bloc ```book en payload pour /api/generate-book.php (InteractiveBook).
 * Format LLM attendu :
 *   ```book
 *   title: ...
 *   language: fr
 *
 *   ## Chapitre 1 — Titre
 *   QCM || question || opt1 | V: bonne | opt3 || explication
 *   VF  || affirmation || V || explication
 *
 *   ## Chapitre 2 — Titre
 *   QRC || question || réponse || indice
 *   ```
 * Retour : { title, language, pages: [{ title, blocks: [{library,params}] }] }
 */

const { parseText2Quiz } = require("./text2quizParser");
const { toH5pPayload } = require("./toH5pParams");

// type API → library H5P (sans version, l'API choisit la plus haute installée)
const TYPE_TO_LIBRARY = {
  multiple_choice: "MultiChoice",
  true_false_question: "TrueFalse",
  fill_in_the_blanks: "Blanks",
};

function extractBookBlock(text) {
  const match = text.match(/```book\s*\n([\s\S]*?)```/);
  return match ? match[1] : null;
}

function parseText2Book(rawOrFullText) {
  const raw = rawOrFullText.includes("```book")
    ? extractBookBlock(rawOrFullText)
    : rawOrFullText;
  if (!raw) return { title: "", language: "fr", pages: [] };

  const lines = raw.split(/\r?\n/);
  let title = "";
  let language = "fr";
  const pages = [];
  let currentPage = null;
  let currentBuffer = [];

  const flushChapter = () => {
    if (!currentPage) return;
    const chapterText = currentBuffer.join("\n");
    const { questions } = parseText2Quiz(chapterText);
    const blocks = [];
    for (const q of questions) {
      try {
        const { type, params } = toH5pPayload(q, language);
        const library = TYPE_TO_LIBRARY[type];
        if (library) blocks.push({ library, params });
      } catch {
        // skip malformed
      }
    }
    if (blocks.length > 0) {
      currentPage.blocks = blocks;
      pages.push(currentPage);
    }
    currentBuffer = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (/^title\s*:/i.test(t) && pages.length === 0 && !currentPage) {
      title = t.replace(/^title\s*:/i, "").trim();
      continue;
    }
    if (/^language\s*:/i.test(t) && pages.length === 0 && !currentPage) {
      language = t.replace(/^language\s*:/i, "").trim() || "fr";
      continue;
    }
    const chapMatch = t.match(/^##\s*(.+?)\s*$/);
    if (chapMatch) {
      flushChapter();
      currentPage = { title: chapMatch[1].replace(/^Chapitre\s+\d+\s*[—-]?\s*/i, "").trim() || chapMatch[1], blocks: [] };
      continue;
    }
    if (currentPage) currentBuffer.push(line);
  }
  flushChapter();

  return { title, language, pages };
}

module.exports = { parseText2Book, extractBookBlock };
