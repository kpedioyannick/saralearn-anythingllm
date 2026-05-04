/**
 * Seed du workspace "Phonétique" pour le module dys-phono.
 * - Crée le workspace s'il n'existe pas (idempotent)
 * - Crée 34 threads, un par paire de confusion phonétique
 * - Crée 4 objectifs par thread (136 rows total). L'ancien objectif "Articulation"
 *   a été retiré : exos de kinesthésie articulatoire (main sur la gorge, pince-nez)
 *   trop difficiles à réaliser en numérique auto-évaluable.
 *
 * Idempotent : exécution multiple sans effet de bord (UNIQUE sur slug).
 *
 * Lancer : node scripts/seed_phono.js
 */

const prisma = require("../utils/prisma");
const { v4: uuidv4 } = require("uuid");

// Liste des 34 paires de confusion (slugs simples : 1-2 lettres = 1 phonème).
// Ordre : par groupe articulatoire (sourdes/sonores → proches → liquides → nasales
// → voyelles orales/nasales → voyelles orales → semi-voyelles → orthographe).
const CONFUSIONS = [
  // Sourdes / sonores (6 paires)
  { pair: "pb", title: "Confusion P / B", desc: "Distinguer les sons [p] (sourd) et [b] (sonore), bilabiales." },
  { pair: "td", title: "Confusion T / D", desc: "Distinguer les sons [t] (sourd) et [d] (sonore), apico-dentales." },
  { pair: "kg", title: "Confusion K / G", desc: "Distinguer les sons [k] (sourd, écrit c/q/k) et [g] (sonore), vélaires." },
  { pair: "fv", title: "Confusion F / V", desc: "Distinguer les sons [f] (sourd) et [v] (sonore), labio-dentales." },
  { pair: "sz", title: "Confusion S / Z", desc: "Distinguer les sons [s] (sourd) et [z] (sonore), alvéolaires." },
  { pair: "chj", title: "Confusion CH / J", desc: "Distinguer les sons [ʃ] (sourd, écrit ch) et [ʒ] (sonore, écrit j ou g), post-alvéolaires." },

  // Constrictives proches (3 paires)
  { pair: "fch", title: "Confusion F / CH", desc: "Distinguer les sons [f] et [ʃ], deux sons souffles à points d'articulation différents." },
  { pair: "vj", title: "Confusion V / J", desc: "Distinguer les sons [v] et [ʒ], deux sons sonores constrictifs." },
  { pair: "sch", title: "Confusion S / CH", desc: "Distinguer les sons [s] (sifflant) et [ʃ] (chuintant), tous deux sourds." },

  // Occlusives proches (6 paires)
  { pair: "pt", title: "Confusion P / T", desc: "Distinguer les sons [p] et [t], occlusives sourdes à points d'articulation différents." },
  { pair: "tk", title: "Confusion T / K", desc: "Distinguer les sons [t] et [k], occlusives sourdes : avant vs arrière de la bouche." },
  { pair: "pk", title: "Confusion P / K", desc: "Distinguer les sons [p] et [k], occlusives sourdes : lèvres vs gorge." },
  { pair: "bd", title: "Confusion B / D", desc: "Distinguer les sons [b] et [d], occlusives sonores : lèvres vs dents." },
  { pair: "dg", title: "Confusion D / G", desc: "Distinguer les sons [d] et [g], occlusives sonores : dents vs gorge." },
  { pair: "bg", title: "Confusion B / G", desc: "Distinguer les sons [b] et [g], occlusives sonores : lèvres vs gorge." },

  // Liquides (1 paire)
  { pair: "lr", title: "Confusion L / R", desc: "Distinguer les sons [l] et [ʁ], liquides à articulation très différente." },

  // Nasales (4 paires)
  { pair: "mn", title: "Confusion M / N", desc: "Distinguer les sons [m] et [n], nasales : lèvres vs dents." },
  { pair: "ngn", title: "Confusion N / GN", desc: "Distinguer les sons [n] et [ɲ] (gn), nasales alvéolaire vs palatale." },
  { pair: "mb", title: "Confusion M / B", desc: "Distinguer les sons [m] (nasale) et [b] (orale), tous deux bilabiaux." },
  { pair: "nd", title: "Confusion N / D", desc: "Distinguer les sons [n] (nasale) et [d] (orale), tous deux apico-dentaux." },

  // Voyelles orales / nasales (4 paires)
  { pair: "a-an", title: "Confusion A / AN", desc: "Distinguer la voyelle orale [a] et la voyelle nasale [ɑ̃] (an, en, am, em)." },
  { pair: "o-on", title: "Confusion O / ON", desc: "Distinguer la voyelle orale [o] et la voyelle nasale [ɔ̃] (on, om)." },
  { pair: "e-in", title: "Confusion È / IN", desc: "Distinguer la voyelle orale [ɛ] et la voyelle nasale [ɛ̃] (in, ain, ein)." },
  { pair: "eu-un", title: "Confusion EU / UN", desc: "Distinguer la voyelle orale [œ]/[ø] et la voyelle nasale [œ̃] (un, um)." },

  // Voyelles orales proches (5 paires)
  { pair: "e-eu", title: "Confusion E / EU", desc: "Distinguer les voyelles [ə] et [ø]/[œ], proches mais distinctes." },
  { pair: "ee", title: "Confusion É / È", desc: "Distinguer les voyelles [e] (é fermé) et [ɛ] (è ouvert)." },
  { pair: "o-eu", title: "Confusion O / EU", desc: "Distinguer les voyelles [o] et [ø], arrondies à arrière vs avant de la bouche." },
  { pair: "iu", title: "Confusion I / U", desc: "Distinguer les voyelles [i] (étirée) et [y] (arrondie)." },
  { pair: "ou-u", title: "Confusion OU / U", desc: "Distinguer les voyelles [u] (ou) et [y] (u), toutes deux arrondies." },

  // Semi-voyelles et palatalisation (2 paires)
  { pair: "i-y", title: "Confusion I / Y / ILL", desc: "Distinguer la voyelle [i] et la semi-voyelle [j] (y, ill, ï)." },
  { pair: "wa-oi", title: "Confusion OUA / OI", desc: "Distinguer les graphies [wa] (oi) avec confusions possibles ou/oi." },

  // Cas spéciaux orthographe (3 paires)
  { pair: "c-c", title: "Confusion C / Ç", desc: "Choisir entre c (devant a, o, u → [k]) et ç (devant a, o, u → [s])." },
  { pair: "g-gu", title: "Confusion G / GU", desc: "Choisir entre g (devant a, o, u → [g]) et gu (devant e, i → [g])." },
  { pair: "s-ss", title: "Confusion S / SS", desc: "Choisir entre s (entre voyelles → [z]) et ss (entre voyelles → [s])." },
];

// 4 objectifs identiques pour chaque confusion. Articulation retirée (kinesthésie
// non auto-évaluable en numérique). Titres alignés sur les MDs Mazade.
const OBJECTIVES = [
  { slugSuffix: "discrimination",     title: "Reconnaître le son entendu",                    desc: "Reconnaître les deux sons à l'oreille." },
  { slugSuffix: "lecture",            title: "Lecture",                                       desc: "Lire correctement les graphies des deux sons." },
  { slugSuffix: "production-mot",     title: "Nomme les dessins et choisis le bon graphème",  desc: "Nommer un dessin et choisir le graphème correct." },
  { slugSuffix: "production-phrase",  title: "Production en phrase / dictée",                 desc: "Écrire les sons correctement dans des phrases et dictées." },
];

const WORKSPACE_NAME = "Phonétique";
const WORKSPACE_SLUG = "phonetique";

async function seed() {
  // 1. Workspace (créer ou retrouver)
  let ws = await prisma.workspaces.findFirst({ where: { slug: WORKSPACE_SLUG } });
  if (!ws) {
    ws = await prisma.workspaces.create({
      data: {
        name: WORKSPACE_NAME,
        slug: WORKSPACE_SLUG,
        openAiTemp: 0.7,
        openAiHistory: 20,
        openAiPrompt: "Tu accompagnes l'élève dans la rééducation de confusions phonétiques (méthode dys-phono). Pour chaque exercice, applique les principes de Mazade : conscience articulatoire, discrimination auditive, association phonème ↔ graphème.",
      },
    });
    console.log(`✅ Workspace créé : "${ws.name}" (id=${ws.id}, slug=${ws.slug})`);
  } else {
    console.log(`ℹ️  Workspace existant : "${ws.name}" (id=${ws.id})`);
  }

  // 2. Threads + objectifs
  let createdThreads = 0;
  let existingThreads = 0;
  let createdObjectives = 0;
  let existingObjectives = 0;

  for (const conf of CONFUSIONS) {
    const threadSlug = `confusion-${conf.pair.replace(/-/g, "-")}`;
    let thread = await prisma.workspace_threads.findUnique({ where: { slug: threadSlug } });
    if (!thread) {
      thread = await prisma.workspace_threads.create({
        data: {
          name: conf.title,
          slug: `${threadSlug}-${uuidv4().slice(0, 8)}`, // slug global doit être unique sur la table
          workspace_id: ws.id,
          subchapterSlug: threadSlug, // c'est le slug stable pour le matching MD
        },
      });
      createdThreads++;
      console.log(`  ➕ Thread "${conf.title}" (id=${thread.id}, subchapterSlug=${thread.subchapterSlug})`);
    } else {
      existingThreads++;
    }

    // Vérifier aussi par subchapterSlug si on retrouve un thread déjà existant
    if (!thread) {
      thread = await prisma.workspace_threads.findFirst({
        where: { subchapterSlug: threadSlug, workspace_id: ws.id },
      });
    }
    if (!thread) continue;

    for (let i = 0; i < OBJECTIVES.length; i++) {
      const obj = OBJECTIVES[i];
      const objSlug = `${conf.pair}-${obj.slugSuffix}`;
      const existing = await prisma.thread_objectives.findUnique({
        where: { threadId_slug: { threadId: thread.id, slug: objSlug } },
      });
      if (existing) {
        existingObjectives++;
        continue;
      }
      await prisma.thread_objectives.create({
        data: {
          threadId: thread.id,
          slug: objSlug,
          title: obj.title,
          description: obj.desc,
          orderIndex: i + 1,
        },
      });
      createdObjectives++;
    }
  }

  console.log("\n--- Récap ---");
  console.log(`Threads      : ${createdThreads} créés, ${existingThreads} existants`);
  console.log(`Objectifs    : ${createdObjectives} créés, ${existingObjectives} existants`);
  console.log(`Total threads dans workspace ${WORKSPACE_NAME} : ${createdThreads + existingThreads}/${CONFUSIONS.length}`);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
