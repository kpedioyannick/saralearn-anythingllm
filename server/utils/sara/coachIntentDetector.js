// Détecteur d'intent pour le workspace coach scolaire.
//
// Calqué sur intentDetector.js : embeddings au démarrage + cosine similarity
// par message + seuil. Réutilise les helpers (embedQuery/embedPassage/
// cosineSimilarity/bestScoreAgainst) exportés par intentDetector.js — pas de
// duplication d'infra embedding.
//
// L'espace d'intents est petit (6 intents) et borné. Pas de modifiers, pas de
// fast-path regex, pas d'options. Si aucun intent ne matche → null, le LLM
// répond en texte libre avec le contexte coach injecté.

const {
  embedPassage,
  embedQuery,
  bestScoreAgainst,
} = require("./intentDetector");

const COACH_INTENTS = require("./coach_intents.json");

// Seuil de match. Plus permissif que les intents matière (0.75) car les
// formulations coach sont plus naturelles et moins ambiguës entre elles —
// on préfère matcher quitte à laisser le LLM affiner avec le contexte.
const COACH_SIMILARITY_THRESHOLD = 0.75;

// Marge minimale entre 1er et 2e candidat. Faible car les 6 intents coach sont
// sémantiquement distants (today/delays/program/progress/catchup/schedule) et
// les ambiguïtés sont rares.
const COACH_INTENT_MARGIN = 0.015;

let _coachAnchors = null;
let _coachInitPromise = null;

async function initCoachAnchors() {
  if (_coachAnchors) return _coachAnchors;
  if (_coachInitPromise) return _coachInitPromise;

  _coachInitPromise = (async () => {
    const anchors = {};
    for (const [intent, phrases] of Object.entries(COACH_INTENTS)) {
      const vectors = [];
      for (const phrase of phrases) {
        const vec = await embedPassage(phrase);
        if (vec) vectors.push(vec);
      }
      anchors[intent] = vectors;
    }
    _coachAnchors = anchors;
    console.log(
      "[Sara/Coach] Intent vectors pré-calculés :",
      Object.keys(anchors).join(", ")
    );
    return anchors;
  })();

  return _coachInitPromise;
}

async function detectCoachIntent(message) {
  try {
    const anchors = await initCoachAnchors();
    const msgVector = await embedQuery(message);
    if (!msgVector) return { intent: null };

    const bestByIntent = {};
    for (const [intent, vectors] of Object.entries(anchors)) {
      const best = bestScoreAgainst(msgVector, vectors);
      if (best >= COACH_SIMILARITY_THRESHOLD) bestByIntent[intent] = best;
    }

    const ranked = Object.entries(bestByIntent).sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) return { intent: null };

    const [first, second] = ranked;
    if (second && first[1] - second[1] < COACH_INTENT_MARGIN && first[1] < 0.85) {
      // Scores tassés sans gagnant clair → laisser le LLM décider avec le contexte.
      return { intent: null };
    }
    return { intent: first[0], score: first[1] };
  } catch (err) {
    console.error("[Sara/Coach] Coach intent detection error:", err.message);
    return { intent: null };
  }
}

module.exports = { detectCoachIntent, initCoachAnchors };
