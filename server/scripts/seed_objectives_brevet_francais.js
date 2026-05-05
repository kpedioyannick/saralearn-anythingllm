/**
 * Seed des 19 objectifs Français (Brevet) pour le thread 5988.
 * Remplace les 5 objectifs méta-épreuve par une liste qui couvre
 * les vrais savoir-faire (compréhension, langue, dictée, réécriture, rédaction).
 *
 * Lancer : node scripts/seed_objectives_brevet_francais.js
 */

const prisma = require("../utils/prisma");

const THREAD_ID = 5988;

function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['']/g, "").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

const OBJECTIVES = [
  { verb: "Identifier",  desc: "la nature et le genre d'un texte littéraire (récit, poésie, théâtre, texte argumentatif)." },
  { verb: "Repérer",     desc: "les éléments narratifs d'un texte : narrateur, point de vue, personnages, cadre spatio-temporel." },
  { verb: "Analyser",    desc: "le sens d'un mot ou d'une expression en contexte (sens propre/figuré, connotation, registre de langue)." },
  { verb: "Interpréter", desc: "une figure de style (métaphore, comparaison, personnification, hyperbole...) et en justifier l'effet." },
  { verb: "Analyser",    desc: "une image (photographie, peinture, BD) en lien avec un texte : composition, point de vue, message." },
  { verb: "Identifier",  desc: "la nature et la fonction des mots dans une phrase (sujet, COD, COI, compléments, attribut)." },
  { verb: "Conjuguer",   desc: "correctement les verbes aux temps de l'indicatif, du subjonctif, du conditionnel et de l'impératif." },
  { verb: "Analyser",    desc: "une phrase complexe (proposition principale, subordonnée relative, conjonctive, circonstancielle)." },
  { verb: "Appliquer",   desc: "les règles d'accord (sujet-verbe, adjectif-nom, participe passé avec être et avoir)." },
  { verb: "Distinguer",  desc: "les homophones grammaticaux (a/à, et/est, ou/où, ces/ses, leur/leurs, ce/se, son/sont...)." },
  { verb: "Réussir",     desc: "une dictée en mobilisant orthographe lexicale et grammaticale, ponctuation et majuscules." },
  { verb: "Réécrire",    desc: "un passage en effectuant une transformation (changement de personne, de temps, de nombre, de voix)." },
  { verb: "Enrichir",    desc: "et mobiliser un vocabulaire varié et précis (synonymes, antonymes, champs lexicaux, registres de langue)." },
  { verb: "Rédiger",     desc: "un texte d'imagination structuré (récit, dialogue, description) en respectant les contraintes du sujet." },
  { verb: "Rédiger",     desc: "un texte de réflexion argumenté avec thèse, arguments, exemples et conclusion." },
  { verb: "Organiser",   desc: "sa rédaction en paragraphes cohérents avec connecteurs logiques et progression thématique." },
  { verb: "Soigner",     desc: "la présentation : ponctuation, majuscules, paragraphes, lisibilité, orthographe." },
  { verb: "Relire",      desc: "et corriger sa production pour repérer et rectifier les erreurs (orthographe, syntaxe, cohérence)." },
  { verb: "Connaître",   desc: "le déroulement et les attendus de l'épreuve de français du brevet (durée, parties, barème, méthode)." },
];

async function main() {
  const existing = await prisma.thread_objectives.findMany({
    where: { threadId: THREAD_ID },
    orderBy: { orderIndex: "asc" },
  });
  console.log(`Thread ${THREAD_ID} : ${existing.length} objectifs existants`);
  for (const e of existing) console.log(`  - [${e.orderIndex}] ${e.title}`);

  console.log(`\nSuppression des ${existing.length} objectifs existants...`);
  await prisma.thread_objectives.deleteMany({ where: { threadId: THREAD_ID } });

  console.log(`\nInsertion des ${OBJECTIVES.length} nouveaux objectifs...`);
  const used = new Set();
  let created = 0;
  for (let i = 0; i < OBJECTIVES.length; i++) {
    const obj = OBJECTIVES[i];
    let slug = slugify(`${obj.verb}-${obj.desc.slice(0, 30)}`);
    if (!slug || slug.length < 3) slug = `obj-${i + 1}`;
    let final = slug, n = 2;
    while (used.has(final)) final = `${slug}-${n++}`;
    used.add(final);
    const title = `${obj.verb} ${obj.desc}`.slice(0, 200);
    try {
      await prisma.thread_objectives.create({
        data: {
          threadId: THREAD_ID,
          slug: final,
          title,
          description: obj.desc.slice(0, 500),
          orderIndex: i + 1,
        },
      });
      created++;
      console.log(`  ✅ [${i + 1}] ${title}`);
    } catch (err) {
      console.error(`  ❌ [${i + 1}] slug=${final}: ${err.message}`);
    }
  }

  console.log(`\n--- Récap ---`);
  console.log(`Supprimés : ${existing.length}`);
  console.log(`Créés     : ${created}/${OBJECTIVES.length}`);
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
