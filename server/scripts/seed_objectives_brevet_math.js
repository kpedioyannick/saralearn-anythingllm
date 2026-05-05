/**
 * Seed des 19 objectifs Mathématiques (Brevet) pour le thread 5987.
 * Remplace les 5 objectifs Thalès existants par une liste qui couvre
 * tout le programme cycle 4 (BO 2020 + ajustements 2023).
 *
 * Lancer : node scripts/seed_objectives_brevet_math.js
 */

const prisma = require("../utils/prisma");

const THREAD_ID = 5987;

function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['']/g, "").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

const OBJECTIVES = [
  { verb: "Maîtriser",   desc: "le calcul avec fractions, puissances de 10, notation scientifique, racines carrées et nombres relatifs." },
  { verb: "Décomposer",  desc: "un entier en facteurs premiers et déterminer le PGCD pour simplifier ou résoudre un problème." },
  { verb: "Résoudre",    desc: "un problème mettant en jeu une proportionnalité, un pourcentage ou un taux d'évolution." },
  { verb: "Développer,", desc: "factoriser et réduire une expression littérale (distributivité, identités remarquables)." },
  { verb: "Résoudre",    desc: "une équation du premier degré ou une équation produit nul, et tester si un nombre en est solution." },
  { verb: "Mettre",      desc: "un problème en équation et exploiter la solution pour conclure." },
  { verb: "Reconnaître,",desc: "représenter et utiliser une fonction linéaire ou affine (image, antécédent, expression)." },
  { verb: "Lire",        desc: "et interpréter un graphique de fonction (image, antécédent, croissance, signe)." },
  { verb: "Appliquer",   desc: "le théorème de Pythagore et sa réciproque pour calculer une longueur ou prouver qu'un triangle est rectangle." },
  { verb: "Appliquer",   desc: "le théorème de Thalès et sa réciproque pour calculer une longueur ou démontrer le parallélisme de deux droites." },
  { verb: "Utiliser",    desc: "les relations trigonométriques (sinus, cosinus, tangente) dans un triangle rectangle." },
  { verb: "Identifier",  desc: "et construire l'image d'une figure par translation, rotation, symétrie ou homothétie." },
  { verb: "Calculer",    desc: "aires et volumes des figures et solides usuels, et décrire une section plane." },
  { verb: "Démontrer",   desc: "une propriété géométrique en rédigeant une preuve structurée mobilisant les théorèmes appropriés." },
  { verb: "Convertir",   desc: "et calculer des grandeurs simples ou composées (longueurs, aires, volumes, durées, vitesses, débits)." },
  { verb: "Calculer",    desc: "et interpréter des indicateurs statistiques (moyenne, médiane, étendue, fréquence) à partir d'une série de données." },
  { verb: "Calculer",    desc: "la probabilité d'un événement dans une situation simple (équiprobabilité, arbre, tableau)." },
  { verb: "Lire,",       desc: "compléter ou modifier un programme Scratch utilisant boucles, conditions et variables pour atteindre un objectif donné." },
  { verb: "Résoudre",    desc: "une tâche complexe en mobilisant plusieurs notions et en rédigeant un raisonnement clair, justifié et conclu." },
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
