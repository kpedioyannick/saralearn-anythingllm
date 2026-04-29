const fetch = require("node-fetch");
const path = require("path");

const EMBEDDING_URL = process.env.EMBEDDING_BASE_PATH || "http://localhost:5001";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL_PREF || "intfloat/multilingual-e5-large";
const SIMILARITY_THRESHOLD = 0.75;
// Seuil plus bas pour les modifiers (formulations courtes, similarités plus tassées).
const MODIFIER_THRESHOLD = 0.70;

// 'again' = relance pure ("encore", "un autre", "refais"...). 3 couches :
// 1) size gate : message > AGAIN_MAX_LEN chars => exclu (anti copier-coller).
// 2) regex fast-path : match direct sans embedding (cas canoniques + typos).
// 3) ancres embedding : rattrape les paraphrases ("j'en veux un autre", etc.).
// Discipline : la regex ne match QUE des messages SANS porteur d'intent
// ("un autre exemple" => exemple, pas again).
const AGAIN_MAX_LEN = 50;
const RELANCE_REGEX = new RegExp(
  "^\\s*(" +
    "encor[e]?s?|" +              // encore, encor, encores
    "an?core|" +                  // ancore (faute frequente)
    "un\\s+autre|une\\s+autre|" +
    "pareil(?:lement)?|" +
    "refais|refait|" +
    "redis|" +
    "[àa]\\s+nouveau|" +
    "encore\\s+une\\s+fois|" +
    "again|another(?:\\s+one)?|same|once\\s+more|do\\s+it\\s+again" +
  ")" +
  "\\s*(stp|svp|please|s'il\\s+(?:te|vous)\\s+pla[iî]t)?" +
  "\\s*[.!?…]*\\s*$",
  "i"
);

const INTENTS_DATA = require("./sara_intents.json");
const { TEMPLATES_EN } = require("./intentTemplates_en");

// Vecteurs d'ancrage pré-calculés au premier appel
let _anchorVectors = null;
let _initPromise = null;

// Get user's preferred language from AnythingLLM userSettings JSON.
// userSettings = { classe, lang, program } (set via Sara onboarding).
// Defaults to "fr" if user is null, settings unparseable, or lang missing.
function getUserLanguage(user) {
  if (!user) return "fr";
  try {
    const raw = user.userSettings;
    const settings = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {});
    const lang = (settings.lang || "fr").toLowerCase();
    return lang === "en" ? "en" : "fr";
  } catch (_) {
    return "fr";
  }
}

const TEMPLATES_FR = {
  fiche: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : fiche de révision enrichie en Markdown selon cette architecture exacte :\n\n# 📚 [Titre de la fiche]\n\n## 🎯 L'essentiel à retenir\n> Résumé en 2-3 phrases clés en blockquote.\n\n## 📖 Cours & Définitions\n### [Notion 1]\nDéfinition claire. **Mot-clé** en gras.\n### [Notion 2]\n...\n\n## 🔢 Formules & Règles importantes\n| Formule / Règle | Ce que ça signifie |\n|---|---|\n| ... | ... |\n\n## 💡 Exemples résolus\n**Exemple 1 :** énoncé\n> Résolution étape par étape\n\n## ⚠️ Erreurs fréquentes à éviter\n- ❌ Erreur typique → ✅ Ce qu'il faut faire\n\n## 🧠 Mémo / Astuce\n> Moyen mnémotechnique ou astuce de rapidité.\n\nAdapter le nombre de sections au contenu réel. Utiliser des emojis pertinents. Ne pas inventer de contenu absent du cours.`,
  carte_mentale: (subject) =>
    `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`markmap contenant la carte mentale. Aucun autre texte avant ou après.\nRègles :\n- La PREMIÈRE ligne du bloc doit être : \`description: <texte pédagogique aussi long que nécessaire qui explique le sujet de la carte, ses concepts clés, leurs relations, et ce qu'il faut retenir — ne pas tronquer, développer chaque idée importante>\`\n- Ensuite la carte mentale en Markdown : \`#\` pour la racine, \`##\` pour les branches principales, \`###\` pour les sous-branches.\n- Chaque nœud = titre court (3-5 mots max). Pas de commentaires HTML.\nExemple :\n\`\`\`markmap\ndescription: Cette carte mentale présente la photosynthèse, le processus par lequel les plantes produisent leur énergie à partir de la lumière. Elle montre les éléments qui interviennent (chlorophylle, eau, CO₂) et les produits formés (glucose, oxygène).\n# Photosynthèse\n## Éléments nécessaires\n### Chlorophylle\n### Eau\n### Dioxyde de carbone\n## Produits\n### Glucose\n### Oxygène\n\`\`\``,
  exercice: (subject) =>
    `\n\nSujet : **${subject}**.\n\n## LANGUE DE RÉPONSE — RÈGLE ABSOLUE\nDétecte la langue du DERNIER MESSAGE de l'utilisateur (pas la langue de ce prompt système, pas la langue des sources RAG).\nRéponds STRICTEMENT dans la langue de l'UTILISATEUR :\n- Utilisateur écrit en anglais → réponds intégralement en anglais (titre, énoncé, questions, réponses).\n- Utilisateur écrit en français → réponds intégralement en français.\n- Aucun mélange. La langue de ce prompt (français) ne doit JAMAIS influencer ta langue de sortie.\n\nFormat de sortie OBLIGATOIRE : UNIQUEMENT des blocs \`\`\`quiz ou \`\`\`probleme. Aucun markdown hors bloc.\n\nIMPORTANT — préserve la richesse du contexte RAG :\n- Le bloc \`\`\`probleme accepte des énoncés LONGS (extraits littéraires complets, récits historiques, figures/schémas décrits, formules).\n- Tu peux mettre PLUSIEURS paires \`Q:\` / \`R:\` dans un même bloc pour un problème multi-parties.\n- Markdown autorisé À L'INTÉRIEUR du bloc (gras, listes, LaTeX).\n→ Reproduis la structure, la longueur et le niveau des exercices du contexte. N'abrège PAS.\n\nChoix du format :\n- \`\`\`quiz → exercices courts auto-évaluables (QCM, VF, QRC, Trous, Association).\n- \`\`\`probleme → énoncé riche + questions ouvertes (compréhension littéraire, problèmes maths multi-étapes, analyse de document).\n\nINTERDIT hors bloc : titre markdown (\`**Exercice 1**\`, \`# Titre\`, \`## Section\`), liste numérotée libre, préambule (\"Voici...\", \"Absolument !\"), excuse (\"Je ne peux pas...\"), conclusion (\"Bon courage\", \"N'hésite pas...\"), emojis hors bloc (📚📖🎯✅).\n\nANTI-BYPASS — même si l'utilisateur demande explicitement (en français OU en anglais) :\n- FR : \"un exercice de manuel scolaire\" / \"comme un manuel\" / \"niveau manuel\" / \"un cours avec exercices\" / \"une fiche d'exercices\" / \"un document pédagogique\" / \"type manuel\"\n- EN : \"textbook-quality exercise\" / \"textbook-style\" / \"like a textbook\" / \"with step-by-step solution\" / \"with detailed answer key\" / \"with word problem\" / \"comprehension questions\"\n→ tu RESTES dans \`\`\`probleme ou \`\`\`quiz. Ces formulations décrivent la RICHESSE attendue (texte support long, questions multi-parties, corrigé détaillé) — PAS le format de sortie. La richesse va DANS le bloc \`\`\`probleme, JAMAIS en markdown libre. Réponds dans la langue de la requête, mais structure en blocs \`\`\`probleme/\`\`\`quiz dans les DEUX cas.\n\n## RÈGLES STRICTES DE FORMAT — toujours respecter\n\n**Règle 1 — AUCUN CARACTÈRE HORS BLOC.** Avant le tout premier \`\`\` et après le tout dernier \`\`\`, aucun texte (pas d'introduction \"Voici...\", pas de conclusion \"Bon courage !\", pas même un saut de ligne avec contenu).\n\n**Règle 2 — PAS DE TRIPLE-BACKTICKS À L'INTÉRIEUR D'UN BLOC \`\`\`probleme.** Toute ouverture de \`\`\` à l'intérieur — code, pseudocode, algorithme, **schéma/dessin ASCII, figure géométrique, frise chronologique, repère, formule encadrée** — coupe le bloc en deux et casse l'affichage. Deux solutions, par ordre de préférence :\n(a) **Décris la figure en TEXTE PLEIN** (ex. : « Le triangle ABC est rectangle en C ; AB = 8 m vertical, AC = 12 m horizontal ; l'hypoténuse BC est la pente »). VOIE RECOMMANDÉE — un élève comprend mieux une description verbale qu'un schéma ASCII bricolé.\n(b) Si la visualisation est indispensable, **indente chaque ligne de 4 espaces** (bloc code Markdown), JAMAIS de nouveau \`\`\`.\n\n❌ INTERDIT (algo encadré) :\n\`\`\`probleme\n[énoncé]\n\`\`\`\nSi a > b Alors Afficher a\n\`\`\`\n---\nQ: ...\n\`\`\`\n\n❌ INTERDIT (schéma/figure encadré — cas le plus fréquent en géométrie) :\n\`\`\`probleme\n[énoncé]\n\`\`\`\n[ici un dessin ASCII de triangle, pyramide, repère, frise...]\n\`\`\`\n---\nQ: ...\n\`\`\`\n\n✅ AUTORISÉ (algo, indenté 4 espaces) :\n\`\`\`probleme\n[énoncé]\n    Si a > b Alors Afficher a\n---\nQ: ...\n\`\`\`\n\n✅ AUTORISÉ (figure décrite en texte — préféré) :\n\`\`\`probleme\nLe triangle ABC est rectangle en C : AB = 8 m vertical, AC = 12 m horizontal, l'hypoténuse BC = la pente.\n---\nQ: ...\n\`\`\`\n\n**Règle 3 — QCM DOIT TOUJOURS MARQUER LA BONNE RÉPONSE AVEC \`V:\`.** Le séparateur entre options est \`|\` (un seul pipe), et exactement UNE option est préfixée \`V:\`.\n❌ INTERDIT : \`QCM || question || a) hago | b) haga | c) hagas || explication\` (aucun V:)\n✅ AUTORISÉ : \`QCM || question || hago | V: haga | hagas || explication\`\n\n**Règle 4 — UN BLOC \`\`\`probleme DOIT CONTENIR AU MOINS 2 PAIRES Q:/R:.** Un énoncé seul sans question est interdit. Si tu n'as qu'une question simple sans énoncé long, utilise \`\`\`quiz à la place.\n\nStructure \`\`\`probleme (peut être longue) :\n\`\`\`probleme\ntitre: [titre]\nniveau: [niveau]\ncompetence: [compétence travaillée]\n\n[Énoncé — aussi long que nécessaire, avec extraits, schémas décrits, contexte complet]\n\n---\nQ: [question 1]\nR: [corrigé détaillé]\n\n---\nQ: [question 2]\nR: [corrigé détaillé]\n\`\`\`\n\nStructure \`\`\`quiz :\n\`\`\`quiz\ncompetence: [compétence travaillée]\nQCM || question || opt1 | V: bonne réponse | opt3 || explication\nVF || affirmation || V || explication\nQRC || question || réponse attendue || indice court\nTrous || Le {{mot}} est dans {{contexte}}\nAssociation || {{terme1::définition1}}{{terme2::définition2}}\n\`\`\`\n\n**Règle 5 — Association : CHAQUE paire term::definition DOIT être encadrée de \`{{...}}\`**, sans séparateur \`|\` entre paires.\n❌ INTERDIT : \`Association || term1::def1{{term2::def2}}\` (1ère paire pas dans \`{{}}\`)\n✅ AUTORISÉ : \`Association || {{term1::def1}}{{term2::def2}}{{term3::def3}}\`\n\nLe LLM choisit librement \`\`\`probleme ou \`\`\`quiz selon ce qui sert le mieux la demande de l'élève.`,
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
  again: () =>
    `\n\nL'élève demande un contenu **similaire** à ta réponse précédente dans ce thread (relance type "encore", "un autre", "pareil"...).\n` +
    `Sans rien répéter à l'identique, propose un nouveau contenu :\n` +
    `- de **MÊME FORMAT** que ta dernière réponse (fiche → nouvelle fiche, exercice → nouvel exercice, exemple → nouvel exemple, dictée → nouvelle dictée, etc.). Respecte les blocs structurés (\`\`\`quiz, \`\`\`probleme, \`\`\`dictee, \`\`\`markmap, \`\`\`video, \`\`\`book, \`\`\`flashcards) si la dernière réponse en utilisait.\n` +
    `- de **MÊME SUJET / niveau** que la conversation en cours.\n` +
    `- avec une **VARIATION** : autre angle, autre exemple, autre énoncé, autre série de questions.\n` +
    `Si l'historique du thread est vide ou ambigu, propose par défaut un exercice court (\`\`\`quiz) sur le sujet du workspace.`,
  generate_h5p: (subject, opts = { format: "quiz" }) => {
    const format = opts.format || "quiz";
    if (format === "book") {
      return `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`book représentant un livre interactif H5P. Aucun texte avant ni après.\nStructure du bloc :\n\`\`\`book\ntitle: [titre du livre]\nlanguage: fr\n\n## Chapitre 1 — [titre du chapitre 1]\n[lignes text2quiz, une par ligne, parmi : QCM, VF, QRC, Trous]\n\n## Chapitre 2 — [titre du chapitre 2]\n[lignes text2quiz]\n\n## Chapitre 3 — [titre du chapitre 3]\n[lignes text2quiz]\n\`\`\`\nLignes text2quiz acceptées :\n- QCM || question || opt1 | V: bonne réponse | opt3 || explication\n- VF || affirmation || V || explication   (V=vrai, F=faux)\n- QRC || question || réponse attendue || indice\n- Trous || Phrase avec {{mot}} caché.\nRègles :\n- 2 à 4 chapitres, 2 à 4 questions par chapitre.\n- Progression pédagogique entre chapitres (compréhension → application → bilan).\n- Pas de markdown hors bloc, pas de préambule.`;
    }
    if (format === "flashcards") {
      return `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`flashcards. Aucun texte avant ni après.\nStructure :\n\`\`\`flashcards\ntitle: [titre du paquet]\nlanguage: fr\n\nQ: [question/recto] || R: [réponse/verso] || tip: [indice optionnel]\nQ: [question 2] || R: [réponse 2] || tip: [indice]\nQ: [question 3] || R: [réponse 3]\n\`\`\`\nRègles :\n- 5 à 10 cartes.\n- Recto = question/concept, verso = réponse courte (1 phrase max).\n- tip optionnel, omis si non pertinent.\n- HTML simple toléré dans Q et R (<strong>, <em>) ; pas de markdown ni emoji.`;
    }
    return `\n\nSujet : **${subject}**.\nFormat de réponse : UNIQUEMENT un bloc \`\`\`quiz avec 3 à 6 questions au format text2quiz. Aucun texte avant ni après.\nLa PREMIÈRE ligne du bloc : \`competence: [compétence travaillée]\`.\nEnsuite, choisis librement parmi ces 3 types (un par ligne) :\n- QCM || question || opt1 | V: bonne réponse | opt3 | opt4 || explication courte\n- VF || affirmation || V || explication courte   (V pour vrai, F pour faux)\n- QRC || question || réponse attendue || indice court\nRègles strictes :\n- Questions en français, niveau adapté au sujet\n- Pour QCM : 3 à 4 options dont EXACTEMENT une correcte (préfixée \`V:\`)\n- Pour QRC : réponse courte (un mot ou groupe de mots), pas une phrase entière\n- Ne pas utiliser d'autres types (Trous, Association, etc. sont ignorés)\n- Pas de Markdown dans les questions (pas de **gras**, pas d'emoji)`;
  },
};

// e5 exige des prefixes de role : "query: " pour les requetes, "passage: " pour
// les ancres. Sans, le modele tourne hors regime entraine et tous les scores se
// tassent (~0.84-0.87) — l'ecart 1er/2e devient indiscriminant.
async function _embedRaw(text) {
  const res = await fetch(`${EMBEDDING_URL}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    timeout: 10000,
  });
  const data = await res.json();
  return data?.data?.[0]?.embedding ?? null;
}

async function embedQuery(text) {
  return _embedRaw("query: " + text);
}

async function embedPassage(text) {
  return _embedRaw("passage: " + text);
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
        const vec = await embedPassage(phrase);
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

// pickH5pFormat : choisit "book" ou "flashcards" si un modifier _h5p_format_*
// dépasse le seuil absolu ET qu'un mot-clé littéral est présent dans le message
// (anti-faux-positifs : "quiz h5p" ne doit pas matcher book sur la sémantique seule).
// Défaut : "quiz".
function pickH5pFormat(msgVector, anchors, message = "") {
  const FORMAT_THRESHOLD = 0.78;
  // Mots-clés littéraux requis pour confirmer le format (au moins 1).
  const KEYWORDS = {
    book: /\b(livre|interactivebook|interactive\s*book|chapitres?)\b/i,
    flashcards: /\b(flashcards?|cartes?|fiches?\s*recto)\b/i,
  };
  const candidates = [
    { f: "book", s: bestScoreAgainst(msgVector, anchors._h5p_format_book || []) },
    { f: "flashcards", s: bestScoreAgainst(msgVector, anchors._h5p_format_flashcards || []) },
  ].sort((a, b) => b.s - a.s);
  const [winner] = candidates;
  if (winner.s > FORMAT_THRESHOLD && KEYWORDS[winner.f].test(message)) {
    return { format: winner.f };
  }
  return { format: "quiz" };
}

async function detectIntentAndOptions(message) {
  try {
    // Couche 1+2 : fast-path 'again'. Court-circuite l'embedding pour les
    // relances pures et evite les loteries de scores tasses.
    if (
      typeof message === "string" &&
      message.length <= AGAIN_MAX_LEN &&
      RELANCE_REGEX.test(message)
    ) {
      return { intent: "again", options: {} };
    }

    const anchors = await initAnchorVectors();
    const msgVector = await embedQuery(message);
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
    // Filtre les intents qui exigent un mot-clé littéral.
    // - h5p : nom propre de techno, l'élève ne peut pas le formuler par sémantique.
    // - dictee : verbes d'attaque "Entraîne-moi"/"fais-moi" sont trop proches des
    //   ancres exercice ; sans le mot "dict[eé]" littéral, l'embedding peut basculer
    //   à tort. Le filtre exige une racine dict- explicite (dictée, dicte, dicter…).
    const eligible = ranked.filter(([intent]) => {
      if (intent === "generate_h5p" && !/\bh5p\b/i.test(message)) return false;
      if (intent === "dictee" && !/\bdict[eé]/i.test(message)) return false;
      // 'again' eligible uniquement pour message court (anti copier-coller).
      if (intent === "again" && message.length > AGAIN_MAX_LEN) return false;
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

    let options = {};
    if (chosen === "video") options = pickVideoOptions(msgVector, anchors);
    else if (chosen === "generate_h5p") options = pickH5pFormat(msgVector, anchors, message);
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

function getIntentTemplate(intent, threadName = "ce sujet", options = {}, lang = "fr") {
  // Pick EN template when lang is "en" AND a non-null EN version exists.
  // Some intents (e.g. dictee) have null in TEMPLATES_EN to indicate FR-only.
  const TBL = (lang === "en" && TEMPLATES_EN[intent]) ? TEMPLATES_EN : TEMPLATES_FR;
  const fn = TBL[intent];
  if (!fn) return "";
  if (intent === "video") {
    const opts = {
      format: options.format || "portrait",
      wordByWord: options.wordByWord !== false,
    };
    return fn(threadName, opts);
  }
  if (intent === "generate_h5p") {
    return fn(threadName, { format: options.format || "quiz" });
  }
  return fn(threadName);
}

module.exports = {
  detectIntent,
  detectIntentAndOptions,
  getIntentTemplate,
  getUserLanguage,
  initAnchorVectors,
  // Helpers réutilisés par coachIntentDetector.js (même infra embeddings).
  embedQuery,
  embedPassage,
  cosineSimilarity,
  bestScoreAgainst,
};
