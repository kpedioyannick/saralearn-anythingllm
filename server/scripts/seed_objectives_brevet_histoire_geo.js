/**
 * Seed des 19 objectifs Histoire-Géographie-EMC (Brevet) pour le thread 5989.
 * Remplace les 5 objectifs (centrés sur les guerres mondiales uniquement)
 * par une liste qui couvre tout le programme cycle 4 : Histoire (1914 à aujourd'hui),
 * Géographie (France/UE/monde) et EMC.
 *
 * Lancer : node scripts/seed_objectives_brevet_histoire_geo.js
 */

const prisma = require("../utils/prisma");

const THREAD_ID = 5989;

function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['']/g, "").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

const OBJECTIVES = [
  { verb: "Caractériser", desc: "la Première Guerre mondiale comme guerre totale et ses conséquences politiques, économiques et humaines." },
  { verb: "Expliquer",    desc: "la mise en place et le fonctionnement des régimes totalitaires en Europe (URSS stalinienne, Italie fasciste, Allemagne nazie)." },
  { verb: "Comprendre",   desc: "la Seconde Guerre mondiale comme guerre d'anéantissement et expliquer le génocide des Juifs et des Tziganes." },
  { verb: "Caractériser", desc: "la France de l'entre-deux-guerres et de la Seconde Guerre mondiale (Front populaire, Vichy, Résistance, Libération)." },
  { verb: "Expliquer",    desc: "la Guerre froide, la décolonisation et la construction européenne entre 1945 et les années 1990." },
  { verb: "Caractériser", desc: "le monde depuis 1991 : nouvel ordre international, mondialisation, conflits contemporains." },
  { verb: "Décrire",      desc: "les transformations politiques et sociales de la République française depuis 1944 (institutions, droits, immigration)." },
  { verb: "Décrire",      desc: "les dynamiques territoriales de la France : aires urbaines, espaces productifs, espaces ruraux et de faible densité." },
  { verb: "Analyser",     desc: "les espaces transfrontaliers et l'insertion de la France dans la mondialisation." },
  { verb: "Expliquer",    desc: "pourquoi et comment aménager le territoire français pour réduire les inégalités." },
  { verb: "Caractériser", desc: "la France et l'Union européenne dans le monde (puissance économique, politique, culturelle)." },
  { verb: "Analyser",     desc: "un espace géographique à différentes échelles (locale, nationale, européenne, mondiale)." },
  { verb: "Identifier",   desc: "les principes et valeurs de la République française (laïcité, liberté, égalité, fraternité, démocratie)." },
  { verb: "Expliquer",    desc: "le fonctionnement des institutions de la Ve République (président, gouvernement, parlement, justice)." },
  { verb: "Comprendre",   desc: "les enjeux de la citoyenneté, de la défense nationale et de la sécurité (engagement, JDC, défense)." },
  { verb: "Analyser",     desc: "un document historique ou géographique (nature, auteur, date, contexte, message)." },
  { verb: "Lire,",        desc: "interpréter et compléter une carte, un croquis, un schéma ou une frise chronologique." },
  { verb: "Maîtriser",    desc: "les repères chronologiques et spatiaux essentiels du programme (dates clés, lieux, acteurs)." },
  { verb: "Rédiger",      desc: "une réponse structurée et argumentée mobilisant connaissances et documents." },
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
