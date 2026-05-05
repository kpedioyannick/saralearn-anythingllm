/**
 * Split des threads HG-EMC (5989) et Sciences (5990) du workspace Brevet (187).
 *
 * Phase 1 — HG-EMC :
 *  - Crée "Histoire", "Géographie", "EMC" (nouveaux threads)
 *  - Reconverti 5989 en "HG-EMC : méthodologie" avec 5 obj méta
 *
 * Phase 2 — Sciences :
 *  - Crée "Physique-Chimie", "SVT", "Technologie" (nouveaux threads)
 *  - Reconverti 5990 en "Sciences : méthodologie" avec 5 obj méta
 *
 * Idempotent partiel : si un thread du même nom existe déjà dans le workspace,
 * il est réutilisé (pas de doublon).
 *
 * Lancer : node scripts/split_brevet_hg_sciences.js
 */

const prisma = require("../utils/prisma");
const crypto = require("crypto");

const WORKSPACE_ID = 187;
const HG_THREAD_ID = 5989;
const SCIENCES_THREAD_ID = 5990;

function uuidv4() {
  return crypto.randomUUID();
}

function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['']/g, "").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

const HISTOIRE = [
  { verb: "Caractériser", desc: "la Première Guerre mondiale comme guerre totale et ses conséquences politiques, économiques et humaines." },
  { verb: "Décrire",      desc: "l'entre-deux-guerres en France et en Europe (crises économiques, montée des totalitarismes)." },
  { verb: "Expliquer",    desc: "la mise en place et le fonctionnement des régimes totalitaires (URSS stalinienne, Italie fasciste, Allemagne nazie)." },
  { verb: "Comprendre",   desc: "la Seconde Guerre mondiale comme guerre d'anéantissement (fronts, batailles, bilan)." },
  { verb: "Expliquer",    desc: "le génocide des Juifs et des Tziganes : étapes, méthodes, acteurs, mémoire." },
  { verb: "Caractériser", desc: "la France de la Seconde Guerre mondiale : défaite, Vichy, Résistance, Libération." },
  { verb: "Expliquer",    desc: "la Guerre froide : bipolarisation, blocs, crises, fin." },
  { verb: "Comprendre",   desc: "la décolonisation et la naissance des nouveaux États (Inde, Algérie, Afrique)." },
  { verb: "Décrire",      desc: "la construction européenne de 1945 à nos jours (CECA, CEE, UE, élargissements)." },
  { verb: "Caractériser", desc: "le monde depuis 1991 : nouvel ordre, mondialisation, conflits, terrorisme." },
  { verb: "Décrire",      desc: "l'évolution de la République française depuis 1944 (institutions, droits sociaux, immigration)." },
  { verb: "Mobiliser",    desc: "les repères chronologiques essentiels du XXe siècle (dates, acteurs, lieux)." },
];

const GEOGRAPHIE = [
  { verb: "Décrire",      desc: "les aires urbaines françaises et leurs dynamiques (métropolisation, périurbanisation)." },
  { verb: "Caractériser", desc: "les espaces productifs français (agriculture, industrie, services, tourisme)." },
  { verb: "Analyser",     desc: "les espaces ruraux et de faible densité en France." },
  { verb: "Expliquer",    desc: "les enjeux de l'aménagement du territoire en France métropolitaine et ultramarine." },
  { verb: "Identifier",   desc: "les espaces transfrontaliers de la France et leurs fonctions." },
  { verb: "Analyser",     desc: "l'insertion de la France dans la mondialisation (échanges, façades maritimes, flux)." },
  { verb: "Caractériser", desc: "l'Union européenne : géographie, institutions, politiques, défis." },
  { verb: "Décrire",      desc: "la France et l'UE dans la mondialisation (puissance, rayonnement, concurrence)." },
  { verb: "Mobiliser",    desc: "les repères spatiaux essentiels (régions, mers, façades, métropoles)." },
  { verb: "Analyser",     desc: "un espace géographique à différentes échelles (locale, nationale, européenne, mondiale)." },
];

const EMC = [
  { verb: "Identifier",   desc: "les principes et valeurs de la République française (liberté, égalité, fraternité, laïcité)." },
  { verb: "Expliquer",    desc: "le fonctionnement des institutions de la Ve République (Président, Gouvernement, Parlement, Justice)." },
  { verb: "Comprendre",   desc: "le principe de laïcité et son application en France (loi de 1905, école, espace public)." },
  { verb: "Caractériser", desc: "les droits et devoirs du citoyen (droits civils, politiques, sociaux)." },
  { verb: "Expliquer",    desc: "les enjeux de la défense nationale et de la sécurité (armée, JDC, SNU, cyberdéfense)." },
  { verb: "Analyser",     desc: "les enjeux de l'engagement (associatif, citoyen, politique, humanitaire)." },
  { verb: "Comprendre",   desc: "la place des médias et la liberté d'expression dans une démocratie." },
  { verb: "Identifier",   desc: "les enjeux contemporains : développement durable, lutte contre les discriminations, égalité femmes-hommes." },
];

const HG_METHODO = [
  { verb: "Analyser",   desc: "un document historique ou géographique (nature, auteur, date, contexte, idées clés)." },
  { verb: "Lire,",      desc: "interpréter et compléter une carte, un croquis ou un schéma." },
  { verb: "Construire", desc: "et lire une frise chronologique (dates, périodes, ruptures)." },
  { verb: "Rédiger",    desc: "une réponse organisée et argumentée mobilisant connaissances et documents." },
  { verb: "Connaître",  desc: "le déroulement et le barème de l'épreuve HG-EMC du brevet (durée, parties, exercices)." },
];

const PHYSIQUE_CHIMIE = [
  { verb: "Identifier",  desc: "les propriétés et les transformations physiques de la matière (états, changements d'état)." },
  { verb: "Distinguer",  desc: "transformations physiques, chimiques et nucléaires." },
  { verb: "Modéliser",   desc: "une transformation chimique : réactifs, produits, équation, conservation de la masse." },
  { verb: "Caractériser",desc: "une solution acide, basique ou neutre (pH, indicateurs colorés)." },
  { verb: "Identifier",  desc: "les principaux ions et leurs tests de reconnaissance." },
  { verb: "Calculer",    desc: "une vitesse moyenne et utiliser les unités du Système international." },
  { verb: "Décrire",     desc: "les forces (poids, frottement) et leurs effets sur le mouvement." },
  { verb: "Comprendre",  desc: "la production, le transport et la conversion de l'énergie électrique." },
  { verb: "Identifier",  desc: "les composants d'un circuit électrique et appliquer la loi d'Ohm." },
  { verb: "Distinguer",  desc: "les sources d'énergie (renouvelables / non renouvelables) et leurs impacts." },
];

const SVT = [
  { verb: "Décrire",     desc: "l'organisation du système solaire et caractériser la planète Terre." },
  { verb: "Expliquer",   desc: "les phénomènes géologiques (séismes, volcanisme, tectonique des plaques)." },
  { verb: "Identifier",  desc: "les manifestations climatiques et le changement climatique (causes, conséquences)." },
  { verb: "Caractériser",desc: "la respiration et la nutrition chez les êtres vivants (animaux, végétaux)." },
  { verb: "Décrire",     desc: "la reproduction sexuée chez l'humain (puberté, fécondation, contraception)." },
  { verb: "Expliquer",   desc: "la transmission des caractères héréditaires (ADN, gènes, chromosomes)." },
  { verb: "Identifier",  desc: "les microorganismes et le fonctionnement du système immunitaire." },
  { verb: "Comprendre",  desc: "les enjeux de la santé : nutrition, addictions, maladies infectieuses." },
  { verb: "Caractériser",desc: "un écosystème et les interactions entre espèces (chaînes alimentaires, biodiversité)." },
  { verb: "Analyser",    desc: "l'impact des activités humaines sur l'environnement et la biodiversité." },
];

const TECHNO = [
  { verb: "Décrire",    desc: "le fonctionnement d'un objet technique (besoin, fonction, contraintes)." },
  { verb: "Identifier", desc: "les matériaux d'un objet et leurs propriétés (mécaniques, environnementales, économiques)." },
  { verb: "Lire",       desc: "et interpréter un schéma fonctionnel ou technique." },
  { verb: "Comprendre", desc: "la chaîne d'information et la chaîne d'énergie d'un système." },
  { verb: "Programmer", desc: "un objet connecté ou un système simple (Scratch, microcontrôleur)." },
  { verb: "Analyser",   desc: "le cycle de vie d'un produit (conception, fabrication, usage, fin de vie)." },
  { verb: "Identifier", desc: "les évolutions historiques d'un objet ou d'un système technique." },
  { verb: "Comprendre", desc: "les enjeux d'un projet industriel (qualité, coût, délai, environnement)." },
  { verb: "Modéliser",  desc: "un objet en 3D ou réaliser une représentation technique (vue éclatée, plan)." },
  { verb: "Identifier", desc: "les enjeux des objets connectés et de la cybersécurité." },
];

const SCIENCES_METHODO = [
  { verb: "Analyser",  desc: "un document scientifique (texte, schéma, graphique, tableau)." },
  { verb: "Formuler",  desc: "une hypothèse et concevoir un protocole expérimental." },
  { verb: "Calculer,", desc: "convertir et utiliser les unités correctes en physique-chimie et SVT." },
  { verb: "Rédiger",   desc: "une réponse scientifique structurée (question, démarche, calcul, conclusion)." },
  { verb: "Connaître", desc: "le déroulement et le barème de l'épreuve Sciences du brevet (2 disciplines tirées au sort)." },
];

const NEW_THREADS = [
  { name: "Histoire",         objectives: HISTOIRE },
  { name: "Géographie",       objectives: GEOGRAPHIE },
  { name: "EMC",              objectives: EMC },
  { name: "Physique-Chimie",  objectives: PHYSIQUE_CHIMIE },
  { name: "SVT",              objectives: SVT },
  { name: "Technologie",      objectives: TECHNO },
];

const RECONVERTED = [
  { id: HG_THREAD_ID,       name: "HG-EMC : méthodologie",   objectives: HG_METHODO },
  { id: SCIENCES_THREAD_ID, name: "Sciences : méthodologie", objectives: SCIENCES_METHODO },
];

async function seedObjectivesForThread(threadId, objectives, label) {
  await prisma.thread_objectives.deleteMany({ where: { threadId } });
  const used = new Set();
  let created = 0;
  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    let slug = slugify(`${obj.verb}-${obj.desc.slice(0, 30)}`);
    if (!slug || slug.length < 3) slug = `obj-${i + 1}`;
    let final = slug, n = 2;
    while (used.has(final)) final = `${slug}-${n++}`;
    used.add(final);
    const title = `${obj.verb} ${obj.desc}`.slice(0, 200);
    try {
      await prisma.thread_objectives.create({
        data: {
          threadId,
          slug: final,
          title,
          description: obj.desc.slice(0, 500),
          orderIndex: i + 1,
        },
      });
      created++;
    } catch (err) {
      console.error(`  ❌ [${label}] [${i + 1}] slug=${final}: ${err.message}`);
    }
  }
  console.log(`  ✅ [${label}] ${created}/${objectives.length} objectifs seedés`);
}

async function ensureThread(name) {
  const existing = await prisma.workspace_threads.findFirst({
    where: { workspace_id: WORKSPACE_ID, name },
  });
  if (existing) {
    console.log(`  ⏭️  Thread "${name}" existe déjà (id=${existing.id}) — réutilisé`);
    return existing;
  }
  const slug = uuidv4();
  const created = await prisma.workspace_threads.create({
    data: { workspace_id: WORKSPACE_ID, name, slug, user_id: null },
  });
  console.log(`  ✅ Thread créé : "${name}" (id=${created.id}, slug=${slug})`);
  return created;
}

async function main() {
  console.log(`\n=== PHASE A : création des 6 nouveaux threads ===\n`);
  const newCreated = [];
  for (const t of NEW_THREADS) {
    const thread = await ensureThread(t.name);
    newCreated.push({ thread, objectives: t.objectives });
  }

  console.log(`\n=== PHASE B : seed objectifs nouveaux threads ===\n`);
  for (const { thread, objectives } of newCreated) {
    await seedObjectivesForThread(thread.id, objectives, thread.name);
  }

  console.log(`\n=== PHASE C : reconversion des 2 threads existants ===\n`);
  for (const r of RECONVERTED) {
    const old = await prisma.workspace_threads.findUnique({ where: { id: r.id } });
    if (!old) { console.error(`  ❌ Thread id=${r.id} introuvable`); continue; }
    if (old.name !== r.name) {
      await prisma.workspace_threads.update({
        where: { id: r.id },
        data: { name: r.name },
      });
      console.log(`  ✅ Thread ${r.id} renommé : "${old.name}" → "${r.name}"`);
    } else {
      console.log(`  ⏭️  Thread ${r.id} déjà nommé "${r.name}"`);
    }
    await seedObjectivesForThread(r.id, r.objectives, r.name);
  }

  console.log(`\n=== RÉCAPITULATIF FINAL ===\n`);
  const allThreads = await prisma.workspace_threads.findMany({
    where: { workspace_id: WORKSPACE_ID },
    orderBy: { id: "asc" },
  });
  for (const t of allThreads) {
    const cnt = await prisma.thread_objectives.count({ where: { threadId: t.id } });
    console.log(`  • ${t.name.padEnd(35)} (id=${t.id}) — ${cnt} objectifs`);
  }
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
