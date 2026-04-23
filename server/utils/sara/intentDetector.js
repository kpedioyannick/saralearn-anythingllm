const fetch = require("node-fetch");
const path = require("path");

const EMBEDDING_URL = process.env.EMBEDDING_BASE_PATH || "http://localhost:5001";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL_PREF || "intfloat/multilingual-e5-large";
const SIMILARITY_THRESHOLD = 0.75;

const INTENTS_DATA = require("./sara_intents.json");

// Vecteurs d'ancrage pré-calculés au premier appel
let _anchorVectors = null;
let _initPromise = null;

const TEMPLATES = {
  fiche: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : fiche de révision enrichie en Markdown selon cette architecture exacte :\n\n# 📚 [Titre de la fiche]\n\n## 🎯 L'essentiel à retenir\n> Résumé en 2-3 phrases clés en blockquote.\n\n## 📖 Cours & Définitions\n### [Notion 1]\nDéfinition claire. **Mot-clé** en gras.\n### [Notion 2]\n...\n\n## 🔢 Formules & Règles importantes\n| Formule / Règle | Ce que ça signifie |\n|---|---|\n| ... | ... |\n\n## 💡 Exemples résolus\n**Exemple 1 :** énoncé\n> Résolution étape par étape\n\n## ⚠️ Erreurs fréquentes à éviter\n- ❌ Erreur typique → ✅ Ce qu'il faut faire\n\n## 🧠 Mémo / Astuce\n> Moyen mnémotechnique ou astuce de rapidité.\n\nAdapter le nombre de sections au contenu réel. Utiliser des emojis pertinents. Ne pas inventer de contenu absent du cours.`,
  carte_mentale: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`markmap contenant la carte mentale. Aucun autre texte.\nRègles :\n- Chaque nœud = titre court (3-5 mots max)\n- Juste après chaque nœud qui nécessite une explication, ajoute une ligne HTML comment : <!-- explication courte en 1-2 phrases -->\n- Exemple :\n## Photosynthèse\n<!-- Processus par lequel les plantes produisent leur énergie à partir de la lumière solaire. -->\n### Chlorophylle\n<!-- Pigment vert qui capture la lumière. Présent dans les chloroplastes. -->`,
  exercice: (subject) =>
    `\n\nSujet : **${subject}**.\nFormats disponibles — choisis librement selon le contenu et le niveau :\n\n**Pour des exercices courts (QCM, vrai/faux, texte à trous…)** → bloc \`\`\`quiz\nLa PREMIÈRE ligne doit être : \`competence: [compétence travaillée]\`\nEnsuite les questions :\n- QCM : \`QCM || question || réponse1 | V: bonne réponse | réponse3 || explication\`\n- Vrai/Faux : \`VF || affirmation || V || explication\`\n- Réponse courte : \`QRC || question || bonne réponse || explication\`\n- Texte à trous : \`Trous || Le {{mot}} est dans {{contexte}}\`\n- Association : \`Association || {{terme1::définition1}}{{terme2::définition2}}\`\n\n**Pour des problèmes ouverts avec énoncé et questions** → bloc \`\`\`probleme\n\`\`\`probleme\ntitre: [titre]\nniveau: [niveau]\ncompetence: [compétence travaillée]\n\n[Énoncé]\n\n---\nQ: [question]\nR: [corrigé détaillé]\n\`\`\`\n\nTu peux combiner les deux formats dans la même réponse si pertinent. Adapte ton choix au contenu des documents fournis et au bon sens pédagogique.`,
  aide_devoir: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : aide structurée en Markdown avec étapes numérotées et explications claires.`,
  exemple: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : exemples concrets et détaillés en Markdown avec explications.`,
  explication: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : explication claire et progressive en Markdown, adaptée au niveau scolaire.`,
  cours: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : cours complet et structuré en Markdown (titres ##, sous-titres ###, exemples, points clés).`,
  video: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`video contenant un JSON de slides pédagogiques. Aucun autre texte.\nRègles :\n- 4 à 8 slides maximum\n- Chaque slide : titre court + description en Markdown (gras, listes, LaTeX si besoin) + subtitlesSrt (texte narré)\n- format: "portrait", wordByWord: true\n- La narration (subtitlesSrt) doit être du texte parlé naturel, sans Markdown\nStructure exacte :\n\`\`\`video\n{\n  "title": "${subject}",\n  "format": "portrait",\n  "wordByWord": true,\n  "slides": [\n    {\n      "id": "s1",\n      "title": "📌 Titre de la slide",\n      "description": "Contenu **Markdown** de la slide.",\n      "subtitlesSrt": "Texte narré pour cette slide."\n    }\n  ]\n}\n\`\`\``,
  dictee: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`dictee contenant la dictée selon les normes officielles françaises.\nFormat du bloc :\n\`\`\`dictee\ntitre: [titre de la dictée]\nniveau: [niveau de la classe]\n\n[phrase 1]||\n[phrase 2]||\n[phrase 3]\n\`\`\`\nRègles :\n- Adapter la longueur au niveau (CM2: 5-7 phrases, 6ème: 6-8, 5ème/4ème: 7-10, 3ème: 9-12)\n- Richesse orthographique adaptée au niveau (accords, homophones, ponctuation variée)\n- Chaque phrase séparée par || (sera lue 2 fois avec pause)\n- IMPORTANT : si l'utilisateur te fournit un texte ou des mots à dicter, utilise EXACTEMENT ce texte sans en ajouter, modifier ou supprimer un seul mot.\n- Pas de texte en dehors du bloc.`,
};

async function embedText(text) {
  const res = await fetch(`${EMBEDDING_URL}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    timeout: 10000,
  });
  const data = await res.json();
  return data?.data?.[0]?.embedding ?? null;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function initAnchorVectors() {
  if (_anchorVectors) return _anchorVectors;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const anchors = {};
    for (const [intent, phrases] of Object.entries(INTENTS_DATA)) {
      const vectors = [];
      for (const phrase of phrases) {
        const vec = await embedText(phrase);
        if (vec) vectors.push(vec);
      }
      anchors[intent] = vectors;
    }
    _anchorVectors = anchors;
    console.log("[Sara] Intent vectors pré-calculés :", Object.keys(anchors).join(", "));
    return anchors;
  })();

  return _initPromise;
}

async function detectIntent(message) {
  try {
    const anchors = await initAnchorVectors();
    const msgVector = await embedText(message);
    if (!msgVector) return null;

    let bestIntent = null;
    let bestScore = SIMILARITY_THRESHOLD;

    for (const [intent, vectors] of Object.entries(anchors)) {
      for (const anchorVec of vectors) {
        const score = cosineSimilarity(msgVector, anchorVec);
        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
        }
      }
    }

    return bestIntent;
  } catch (err) {
    console.error("[Sara] Intent detection error:", err.message);
    return null;
  }
}

function getIntentTemplate(intent, threadName = "ce sujet") {
  const fn = TEMPLATES[intent];
  return fn ? fn(threadName) : "";
}

module.exports = { detectIntent, getIntentTemplate, initAnchorVectors };
