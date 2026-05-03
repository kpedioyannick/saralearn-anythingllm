/**
 * Seed manuel pour les 8 threads que le LLM n'a pas pu traiter (parse_fail).
 * Objectifs rédigés à la main par Claude après lecture du nom du thread + classe.
 *
 * Lancer : node scripts/seed_objectives_manual_8.js
 */

const prisma = require("../utils/prisma");

function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['']/g, "").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

// Objectifs de dictée — applicables tous niveaux, le LLM Sara adaptera la complexité
const DICTEE_OBJECTIVES = [
  { verb: "Mémoriser", desc: "l'orthographe lexicale des mots étudiés." },
  { verb: "Appliquer", desc: "les règles d'accord (sujet-verbe, adjectif-nom, participe passé)." },
  { verb: "Identifier", desc: "les homophones grammaticaux et choisir la bonne graphie (a/à, et/est, ou/où, son/sont…)." },
  { verb: "Respecter", desc: "la ponctuation et les majuscules dans la transcription." },
  { verb: "Relire", desc: "et corriger ses erreurs en utilisant ses connaissances de la langue." },
];

// Mapping thread → objectifs sur-mesure
const PER_THREAD = {
  // 5996,5995,5994,5993,5992,5991 — Dictée (2nde, 3eme, 4eme, 5eme, 6eme, CM2)
  5996: DICTEE_OBJECTIVES,
  5995: DICTEE_OBJECTIVES,
  5994: DICTEE_OBJECTIVES,
  5993: DICTEE_OBJECTIVES,
  5992: DICTEE_OBJECTIVES,
  5991: DICTEE_OBJECTIVES,
  // 6083 — L'usage du dictionnaire (CM2 français)
  6083: [
    { verb: "Trouver", desc: "un mot dans un dictionnaire en utilisant l'ordre alphabétique." },
    { verb: "Identifier", desc: "la nature grammaticale d'un mot grâce au dictionnaire (n.m., adj., v...)." },
    { verb: "Distinguer", desc: "les différents sens d'un mot polysémique selon le contexte." },
    { verb: "Comprendre", desc: "les abréviations et symboles utilisés dans un dictionnaire." },
    { verb: "Vérifier", desc: "l'orthographe d'un mot et son emploi dans le dictionnaire." },
  ],
  // 6497 — Electrochemistry (grade 9 chemistry)
  6497: [
    { verb: "Understand", desc: "oxidation-reduction (redox) reactions and the transfer of electrons between species." },
    { verb: "Identify", desc: "oxidizing and reducing agents in a chemical equation." },
    { verb: "Balance", desc: "redox reactions using the half-reaction method." },
    { verb: "Describe", desc: "how a galvanic (voltaic) cell generates electrical energy from chemical reactions." },
    { verb: "Explain", desc: "the principle of electrolysis and its industrial applications." },
  ],
};

async function main() {
  let createdTotal = 0;
  let threadsTreated = 0;

  for (const [threadId, objectives] of Object.entries(PER_THREAD)) {
    const tid = parseInt(threadId, 10);
    const existing = await prisma.thread_objectives.count({ where: { threadId: tid } });
    if (existing > 0) {
      console.log(`  ⏭️  thread ${tid} a déjà ${existing} objectifs — skip`);
      continue;
    }
    threadsTreated++;
    const used = new Set();
    for (let i = 0; i < objectives.length; i++) {
      const obj = objectives[i];
      let slug = slugify(`${obj.verb}-${obj.desc.slice(0, 30)}`);
      if (!slug || slug.length < 3) slug = `obj-${i + 1}`;
      let final = slug, n = 2;
      while (used.has(final)) final = `${slug}-${n++}`;
      used.add(final);
      try {
        await prisma.thread_objectives.create({
          data: {
            threadId: tid,
            slug: final,
            title: `${obj.verb} ${obj.desc}`.slice(0, 200),
            description: obj.desc.slice(0, 500),
            orderIndex: i + 1,
          },
        });
        createdTotal++;
      } catch (err) {
        console.error(`  ❌ thread ${tid} slug=${final}: ${err.message}`);
      }
    }
    console.log(`  ✅ thread ${tid} : ${objectives.length} objectifs créés`);
  }

  console.log(`\n--- Récap ---`);
  console.log(`Threads traités : ${threadsTreated}`);
  console.log(`Objectifs créés : ${createdTotal}`);
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
