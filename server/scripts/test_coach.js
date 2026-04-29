// Test isolé de la pipeline coach :
// 1. Détecteur d'intent sur des phrases types
// 2. Génération du contexte coach pour user 1
//
// Pas de chat LLM réel, uniquement la chaîne de détection + contexte.

require("dotenv").config({ path: __dirname + "/../.env.development" });
const prisma = require("../utils/prisma");
const { detectCoachIntent, initCoachAnchors } = require("../utils/sara/coachIntentDetector");
const { getCoachingContext } = require("../utils/sara/coachingContext");

const TEST_PHRASES = [
  // coach_today
  "Qu'est-ce que j'ai à faire aujourd'hui ?",
  "Ma séance du jour ?",
  // coach_delays
  "Ai-je pris du retard ?",
  "Suis-je à jour sur le programme ?",
  // coach_progress
  "Qu'est-ce que j'ai déjà acquis ?",
  "Quels sont mes points faibles ?",
  // coach_catchup
  "Comment rattraper mon retard ?",
  // coach_program
  "Quel est mon programme ?",
  // coach_schedule_subject
  "Quand dois-je travailler les maths ?",
  // hors-intent
  "Fais-moi une fiche sur Pythagore",  // attendu: null (le coach redirige)
  "Bonjour ça va ?",                    // attendu: null
];

(async () => {
  console.log("=== Init des ancres coach ===");
  const t0 = Date.now();
  await initCoachAnchors();
  console.log(`(init en ${Date.now() - t0}ms)\n`);

  console.log("=== Détection d'intent ===");
  for (const p of TEST_PHRASES) {
    const r = await detectCoachIntent(p);
    const score = r.score ? r.score.toFixed(3) : "—";
    console.log(`  [${(r.intent || "null").padEnd(25)}] (${score})  "${p}"`);
  }

  console.log("\n=== Contexte coach pour user 1 ===");
  const u = await prisma.users.findUnique({ where: { id: 1 } });
  if (!u) {
    console.error("user 1 introuvable");
    process.exit(1);
  }
  const ctx = await getCoachingContext(u);
  console.log(ctx);

  await prisma.$disconnect();
})();
