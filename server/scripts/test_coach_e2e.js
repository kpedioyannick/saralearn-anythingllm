// Test end-to-end coach : envoi de messages au LLM avec system prompt coach +
// contexte injecté, vérification des comportements attendus.
//
// Pas d'appel HTTP : on appelle directement le LLMConnector comme stream.js.
// Cela teste l'intégration system prompt + contexte + LLM, sans la couche
// auth/streaming du serveur.

require("dotenv").config({ path: __dirname + "/../.env.development" });
const prisma = require("../utils/prisma");
const { getLLMProvider } = require("../utils/helpers");
const { chatPrompt } = require("../utils/chats");
const { getCoachingContext } = require("../utils/sara/coachingContext");

const SCENARIOS = [
  {
    name: "1. Demande coach progression",
    msg: "Quels sont mes points faibles en ce moment ?",
    expect: ["chiffre cité", "pas de bloc ```", "redirection vers workspace matière implicite ou absente"],
  },
  {
    name: "2. Demande coach today",
    msg: "Qu'est-ce que j'ai à faire aujourd'hui ?",
    expect: ["plan/programme évoqué", "pas de bloc ```"],
  },
  {
    name: "3. Demande retard",
    msg: "Ai-je pris du retard sur mon programme ?",
    expect: ["semaine 1, 6 jours/sem évoqué", "diagnostic à partir des données"],
  },
  {
    name: "4. Tentative fiche (doit rediriger)",
    msg: "Fais-moi une fiche sur Pythagore.",
    expect: ["redirection vers 3eme — Mathématiques", "pas de bloc ```fiche / contenu pédagogique"],
  },
  {
    name: "5. Tentative quiz (doit rediriger)",
    msg: "Donne-moi un quiz sur les équations.",
    expect: ["redirection vers workspace mathématiques", "pas de bloc ```quiz"],
  },
];

(async () => {
  const u = await prisma.users.findUnique({ where: { id: 1 } });
  const ws = await prisma.workspaces.findUnique({ where: { slug: "coach-scolaire" } });
  if (!u || !ws) { console.error("user 1 ou workspace coach-scolaire manquant"); process.exit(1); }

  const baseSystem = await chatPrompt(ws, u);
  const ctx = await getCoachingContext(u);
  const systemPrompt = `${baseSystem}\n\n${ctx}`;

  console.log("=== System prompt (extrait) ===");
  console.log(systemPrompt.slice(0, 600), "...\n");
  console.log(`(longueur totale : ${systemPrompt.length} chars)\n`);

  const LLM = getLLMProvider({ provider: ws.chatProvider, model: ws.chatModel });
  console.log("LLM:", LLM.constructor.name, "\n");

  for (const sc of SCENARIOS) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`▶ ${sc.name}`);
    console.log(`  Élève: "${sc.msg}"`);
    console.log(`  Attendu: ${sc.expect.join(" / ")}`);
    try {
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
    } catch (e) {
      console.log(`  ERREUR: ${e.message}`);
    }
  }

  await prisma.$disconnect();
})();
