const fetch = require("node-fetch");
const path = require("path");

const EMBEDDING_URL = process.env.EMBEDDING_BASE_PATH || "http://localhost:5001";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL_PREF || "intfloat/multilingual-e5-large";
const SIMILARITY_THRESHOLD = 0.75;
// Seuil plus bas pour les modifiers (formulations courtes, similarités plus tassées).
const MODIFIER_THRESHOLD = 0.70;

const INTENTS_DATA = require("./sara_intents.json");

// Vecteurs d'ancrage pré-calculés au premier appel
let _anchorVectors = null;
let _initPromise = null;

const TEMPLATES = {
  fiche: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : fiche de révision enrichie en Markdown selon cette architecture exacte :\n\n# 📚 [Titre de la fiche]\n\n## 🎯 L'essentiel à retenir\n> Résumé en 2-3 phrases clés en blockquote.\n\n## 📖 Cours & Définitions\n### [Notion 1]\nDéfinition claire. **Mot-clé** en gras.\n### [Notion 2]\n...\n\n## 🔢 Formules & Règles importantes\n| Formule / Règle | Ce que ça signifie |\n|---|---|\n| ... | ... |\n\n## 💡 Exemples résolus\n**Exemple 1 :** énoncé\n> Résolution étape par étape\n\n## ⚠️ Erreurs fréquentes à éviter\n- ❌ Erreur typique → ✅ Ce qu'il faut faire\n\n## 🧠 Mémo / Astuce\n> Moyen mnémotechnique ou astuce de rapidité.\n\nAdapter le nombre de sections au contenu réel. Utiliser des emojis pertinents. Ne pas inventer de contenu absent du cours.`,
  carte_mentale: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`markmap contenant la carte mentale. Aucun autre texte avant ou après.\nRègles :\n- La PREMIÈRE ligne du bloc doit être : \`description: <texte pédagogique aussi long que nécessaire qui explique le sujet de la carte, ses concepts clés, leurs relations, et ce qu'il faut retenir — ne pas tronquer, développer chaque idée importante>\`\n- Ensuite la carte mentale en Markdown : \`#\` pour la racine, \`##\` pour les branches principales, \`###\` pour les sous-branches.\n- Chaque nœud = titre court (3-5 mots max). Pas de commentaires HTML.\nExemple :\n\`\`\`markmap\ndescription: Cette carte mentale présente la photosynthèse, le processus par lequel les plantes produisent leur énergie à partir de la lumière. Elle montre les éléments qui interviennent (chlorophylle, eau, CO₂) et les produits formés (glucose, oxygène).\n# Photosynthèse\n## Éléments nécessaires\n### Chlorophylle\n### Eau\n### Dioxyde de carbone\n## Produits\n### Glucose\n### Oxygène\n\`\`\``,
  exercice: (subject) =>
    `\n\nSujet : **${subject}**.\n\nFormat de sortie OBLIGATOIRE : UNIQUEMENT des blocs \`\`\`quiz ou \`\`\`probleme. Aucun markdown hors bloc.\n\nIMPORTANT — préserve la richesse du contexte RAG :\n- Le bloc \`\`\`probleme accepte des énoncés LONGS (extraits littéraires complets, récits historiques, figures/schémas décrits, formules).\n- Tu peux mettre PLUSIEURS paires \`Q:\` / \`R:\` dans un même bloc pour un problème multi-parties (typique brevet).\n- Markdown autorisé À L'INTÉRIEUR du bloc (gras, listes, LaTeX).\n→ Reproduis la structure, la longueur et le niveau des exercices du contexte. N'abrège PAS.\n\nChoix du format :\n- \`\`\`quiz → exercices courts auto-évaluables (QCM, VF, QRC, Trous, Association).\n- \`\`\`probleme → énoncé riche + questions ouvertes (brevet, compréhension littéraire, problèmes maths multi-étapes).\n\nINTERDIT hors bloc : titre markdown (\`**Exercice 1**\`), liste numérotée libre, préambule (\"Voici...\"), excuse (\"Je ne peux pas...\"), conclusion.\n\nStructure \`\`\`probleme (peut être longue) :\n\`\`\`probleme\ntitre: [titre]\nniveau: [niveau]\ncompetence: [compétence travaillée]\n\n[Énoncé — aussi long que nécessaire, avec extraits, schémas décrits, contexte complet]\n\n---\nQ: [question 1]\nR: [corrigé détaillé]\n\n---\nQ: [question 2]\nR: [corrigé détaillé]\n\`\`\`\n\nStructure \`\`\`quiz :\n\`\`\`quiz\ncompetence: [compétence travaillée]\nQCM || question || opt1 | V: bonne réponse | opt3 || explication\nVF || affirmation || V || explication\nQRC || question || réponse attendue || indice court\nTrous || Le {{mot}} est dans {{contexte}}\nAssociation || {{terme1::définition1}}{{terme2::définition2}}\n\`\`\`\n\nCombinaison autorisée si pertinent (ex: \`\`\`probleme pour le sujet brevet + \`\`\`quiz pour vérifier des acquis).`,
  aide_devoir: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : aide structurée en Markdown avec étapes numérotées et explications claires.`,
  exemple: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : exemples concrets et détaillés en Markdown avec explications.`,
  explication: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : explication claire et progressive en Markdown, adaptée au niveau scolaire.`,
  cours: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : cours complet et structuré en Markdown (titres ##, sous-titres ###, exemples, points clés).`,
  video: (subject, opts = { format: "portrait", wordByWord: true }) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`video contenant un JSON de slides pédagogiques. Aucun autre texte.\nRègles :\n- Choisis librement le nombre de slides selon le besoin pédagogique du sujet (pas de limite)\n- Chaque slide : titre court + description en Markdown (gras, listes, LaTeX si besoin) + subtitlesSrt (texte narré)\n- Garde une narration de 15 à 20 secondes par slide (environ 35 à 50 mots) pour laisser le temps à l'élève de comprendre le concept\n- format: "${opts.format}", wordByWord: ${opts.wordByWord}\n- La narration (subtitlesSrt) doit être du texte parlé naturel, sans Markdown\nStructure exacte :\n\`\`\`video\n{\n  "title": "${subject}",\n  "format": "${opts.format}",\n  "wordByWord": ${opts.wordByWord},\n  "slides": [\n    {\n      "id": "s1",\n      "title": "📌 Titre de la slide",\n      "description": "Contenu **Markdown** de la slide.",\n      "subtitlesSrt": "Texte narré pour cette slide."\n    }\n  ]\n}\n\`\`\``,
  dictee: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`dictee contenant la dictée selon les normes officielles françaises.\nFormat du bloc :\n\`\`\`dictee\ntitre: [titre de la dictée]\nniveau: [niveau de la classe]\n\n[phrase 1]||\n[phrase 2]||\n[phrase 3]\n\`\`\`\nRègles :\n- Adapter la longueur au niveau (CM2: 5-7 phrases, 6ème: 6-8, 5ème/4ème: 7-10, 3ème: 9-12)\n- Richesse orthographique adaptée au niveau (accords, homophones, ponctuation variée)\n- Chaque phrase séparée par || (sera lue 2 fois avec pause)\n- IMPORTANT : si l'utilisateur te fournit un texte ou des mots à dicter, utilise EXACTEMENT ce texte sans en ajouter, modifier ou supprimer un seul mot.\n- Pas de texte en dehors du bloc.`,
  generate_h5p: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`quiz avec 3 à 6 questions au format text2quiz. Aucun texte avant ni après.\nLa PREMIÈRE ligne du bloc : \`competence: [compétence travaillée]\`.\nEnsuite, choisis librement parmi ces 3 types (un par ligne) :\n- QCM || question || opt1 | V: bonne réponse | opt3 | opt4 || explication courte\n- VF || affirmation || V || explication courte   (V pour vrai, F pour faux)\n- QRC || question || réponse attendue || indice court\nRègles strictes :\n- Questions en français, niveau adapté au sujet\n- Pour QCM : 3 à 4 options dont EXACTEMENT une correcte (préfixée \`V:\`)\n- Pour QRC : réponse courte (un mot ou groupe de mots), pas une phrase entière\n- Ne pas utiliser d'autres types (Trous, Association, etc. sont ignorés)\n- Pas de Markdown dans les questions (pas de **gras**, pas d'emoji)`,
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

function bestScoreAgainst(msgVector, anchorVectors) {
  let best = -1;
  for (const v of anchorVectors) {
    const score = cosineSimilarity(msgVector, v);
    if (score > best) best = score;
  }
  return best;
}

// Modifiers pilotés par vecteurs : on choisit le format dont le groupe
// _video_format_* a la meilleure similarité (au-dessus du seuil), sinon portrait.
// wordByWord = false uniquement si _video_no_karaoke dépasse le seuil.
function pickVideoOptions(msgVector, anchors) {
  // Format : seuil absolu + marge sur le 2e. Quand les 3 scores sont serrés
  // (aucun signal explicite de format), aucun ne doit l'emporter → fallback portrait.
  const FORMAT_THRESHOLD = 0.75;
  const FORMAT_MARGIN = 0.005;
  const formats = ["portrait", "landscape", "square"];
  const scored = formats
    .map((f) => ({
      f,
      s: bestScoreAgainst(msgVector, anchors[`_video_format_${f}`] || []),
    }))
    .sort((a, b) => b.s - a.s);
  const [winner, runnerUp] = scored;
  const bestFormat =
    winner.s > FORMAT_THRESHOLD && winner.s - runnerUp.s > FORMAT_MARGIN
      ? winner.f
      : "portrait";

  // wordByWord : scoring comparatif. Le signal "vidéo" sature les similarités
  // (~0.80 pour tout message parlant de vidéo), donc un seuil absolu ne discrimine
  // pas. On compare le groupe "no_karaoke" au groupe "karaoke" (cas par défaut)
  // et on désactive uniquement si "no_karaoke" l'emporte avec une marge claire
  // ET que sa proximité absolue est suffisamment forte (évite les false-positifs
  // quand le delta est ténu sur des contenus non reliés au karaoké).
  const noKaraokeScore = bestScoreAgainst(msgVector, anchors._video_no_karaoke || []);
  const karaokeScore = bestScoreAgainst(msgVector, anchors._video_karaoke || []);
  const wordByWord = !(
    noKaraokeScore - karaokeScore > 0.005 && noKaraokeScore > 0.88
  );

  return { format: bestFormat, wordByWord };
}

async function detectIntentAndOptions(message) {
  try {
    const anchors = await initAnchorVectors();
    const msgVector = await embedText(message);
    if (!msgVector) return { intent: null, options: {} };

    // On calcule le meilleur score par intent (pas juste le best global)
    // pour pouvoir basculer vers le 2e meilleur si une garde filtre le gagnant.
    // Les clés _*-prefixées sont des modifiers (pas des intents) → exclues du ranking.
    const bestByIntent = {};
    for (const [intent, vectors] of Object.entries(anchors)) {
      if (intent.startsWith("_")) continue;
      const best = bestScoreAgainst(msgVector, vectors);
      if (best >= SIMILARITY_THRESHOLD) bestByIntent[intent] = best;
    }

    const ranked = Object.entries(bestByIntent).sort((a, b) => b[1] - a[1]);
    // Filtre les intents qui exigent un mot-clé littéral. Pour h5p uniquement :
    // "h5p" est un nom propre de techno, l'élève ne peut pas le formuler par
    // sémantique. Pour dictée on FAIT CONFIANCE à l'embedding (synonymes,
    // fautes), c'est la marge ci-dessous qui filtre les ambiguïtés.
    const eligible = ranked.filter(([intent]) => {
      if (intent === "generate_h5p" && !/\bh5p\b/i.test(message)) return false;
      return true;
    });
    if (eligible.length === 0) return { intent: null, options: {} };

    // Fix 1 — Anti-ambiguïté : un intent gagne SOIT s'il a un score absolu
    // confortable (≥ 0.85) SOIT s'il bat clairement le 2e (Δ ≥ 0.02). Si les
    // deux conditions échouent → tous les scores sont tassés bas, c'est du
    // bruit (ex: "Je veux que la vidéo soit plein écran" → tous ~0.84) → null.
    const INTENT_MARGIN = 0.02;
    const STRONG_INTENT_SCORE = 0.85;
    const [first, second] = eligible;
    const gapClear =
      !second || first[1] - second[1] >= INTENT_MARGIN;
    const scoreStrong = first[1] >= STRONG_INTENT_SCORE;
    if (!gapClear && !scoreStrong) return { intent: null, options: {} };
    const chosen = first[0];

    const options = chosen === "video" ? pickVideoOptions(msgVector, anchors) : {};
    return { intent: chosen, options };
  } catch (err) {
    console.error("[Sara] Intent detection error:", err.message);
    return { intent: null, options: {} };
  }
}

async function detectIntent(message) {
  const { intent } = await detectIntentAndOptions(message);
  return intent;
}

function getIntentTemplate(intent, threadName = "ce sujet", options = {}) {
  const fn = TEMPLATES[intent];
  if (!fn) return "";
  if (intent === "video") {
    const opts = {
      format: options.format || "portrait",
      wordByWord: options.wordByWord !== false,
    };
    return fn(threadName, opts);
  }
  return fn(threadName);
}

module.exports = { detectIntent, detectIntentAndOptions, getIntentTemplate, initAnchorVectors };
