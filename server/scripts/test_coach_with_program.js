// Test du coach AVEC contexte programme RAG : vérifier qu'il sait répondre
// précisément aux questions sur le contenu hebdomadaire du programme.
//
// Reproduit la pipeline complète de stream.js : RAG vectorSearchResults +
// chatPrompt + getCoachingContext + LLM appel.

require("dotenv").config({ path: __dirname + "/../.env.development" });
const prisma = require("../utils/prisma");
const { getLLMProvider, getVectorDbClass } = require("../utils/helpers");
const { chatPrompt } = require("../utils/chats");
const { getCoachingContext } = require("../utils/sara/coachingContext");

const SCENARIOS = [
  {
    name: "1. Programme S3",
    msg: "Qu'est-ce que je dois travailler en semaine 3 ?",
    expect: "fonctions linéaires et affines / théâtre / guerre froide / électricité",
  },
  {
    name: "2. Cycle de révision",
    msg: "Comment je dois m'y prendre pour réviser un chapitre dans le workspace matière ?",
    expect: "carte mentale → fiche → vidéo → quiz, 4×15 min",
  },
  {
    name: "3. Rotation hebdo",
    msg: "Quelle matière je travaille le mardi ?",
    expect: "rattrapage point faible (créneau 1h Brevet) + 3eme — Français (créneau 2)",
  },
  {
    name: "4. Spécificité S7",
    msg: "Le samedi de la semaine 7 je fais quoi ?",
    expect: "buffer libre, pas d'épreuve blanche, rattrapage point faible",
  },
];

(async () => {
  const u = await prisma.users.findUnique({ where: { id: 1 } });
  const ws = await prisma.workspaces.findUnique({ where: { slug: "coach-scolaire" } });
  if (!u || !ws) { console.error("manquant"); process.exit(1); }

  const baseSystem = await chatPrompt(ws, u);
  const ctx = await getCoachingContext(u);
  const LLM = getLLMProvider({ provider: ws.chatProvider, model: ws.chatModel });
  const VectorDb = getVectorDbClass();

  for (const sc of SCENARIOS) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`▶ ${sc.name}`);
    console.log(`  Élève: "${sc.msg}"`);
    console.log(`  Attendu: ${sc.expect}`);

    // RAG search dans la namespace coach-scolaire
    const search = await VectorDb.performSimilaritySearch({
      namespace: ws.slug,
      input: sc.msg,
      LLMConnector: LLM,
      similarityThreshold: ws.similarityThreshold ?? 0.25,
      topN: ws.topN || 4,
    });
    const ragChunks = (search.contextTexts || []).join("\n\n---\n\n");
    console.log(`  RAG: ${(search.contextTexts || []).length} chunks ramenés (${ragChunks.length} chars)`);

    const systemPrompt = `${baseSystem}\n\n${ctx}\n\n## Extraits du programme (RAG)\n${ragChunks}`;

    const { textResponse } = await LLM.getChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: sc.msg },
      ],
      { temperature: 0.3 }
    );
    console.log(`  ─ Réponse coach ─`);
    console.log(textResponse.split("\n").map((l) => "  | " + l).join("\n"));
    const hasBlock = /```(fiche|quiz|probleme|video|dictee|markmap|book|flashcards|h5p)/i.test(textResponse);
    console.log(`  ${hasBlock ? "❌ BLOC PÉDAGOGIQUE DÉTECTÉ" : "✅ pas de bloc pédagogique"}`);
  }

  await prisma.$disconnect();
})();
