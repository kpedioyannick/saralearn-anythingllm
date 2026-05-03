/**
 * Seed `thread_objectives` pour TOUS les threads en s'appuyant sur le contenu
 * RAG ingéré (sections du MD du chapitre).
 *
 * Stratégie B' — Sections du MD comme objectifs :
 *   1. Pour chaque thread, on cherche son fichier RAG ingéré dans
 *      `storage/documents/custom-documents/<subchapterSlug>-rag.md-<uuid>.json`
 *   2. On parse les sections du MD (2 conventions détectées) :
 *      - Style FR : `## Section : Nom` ou `## Nom` + paragraphe ou `### Attendus officiels (BO)`
 *      - Style EN : `**Title**` en début de ligne suivi d'un paragraphe
 *   3. Chaque section devient 1 objectif :
 *      - slug = slugify(titre)
 *      - title = titre nettoyé (sans préfixe "Section : ")
 *      - description = 1ère phrase substantielle (BO si dispo, sinon 1er para)
 *   4. Fallback Bloom 5 objectifs si aucune section trouvée
 *
 * Idempotent : skip les threads qui ont déjà des objectifs.
 *
 * Lancer : node scripts/seed_thread_objectives.js [--dry-run] [--limit=N]
 */

const fs = require("fs");
const path = require("path");
const prisma = require("../utils/prisma");

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10);

const DOCS_DIR = path.resolve(__dirname, "../storage/documents/custom-documents");
const EXCLUDED_WORKSPACE_SLUGS = ["phonetique", "coach-scolaire"];

const BLOOM_FALLBACK = [
  { slug: "comprendre", title: "Comprendre", desc: "Comprendre les notions clés de {{name}}." },
  { slug: "memoriser", title: "Mémoriser", desc: "Retenir le vocabulaire et les règles essentielles de {{name}}." },
  { slug: "appliquer", title: "Appliquer", desc: "Résoudre des exercices d'application sur {{name}}." },
  { slug: "analyser", title: "Analyser", desc: "Analyser un cas, un texte ou un problème sur {{name}}." },
  { slug: "evaluer", title: "Évaluer", desc: "Auto-évaluer ses acquis sur {{name}} et corriger ses erreurs." },
];

// ---------- Utilities ----------

function slugify(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function findRagFile(subchapterSlug) {
  if (!subchapterSlug) return null;
  if (!fs.existsSync(DOCS_DIR)) return null;
  const prefix = `${subchapterSlug}-rag.md-`;
  const found = fs.readdirSync(DOCS_DIR).find((f) => f.startsWith(prefix));
  return found ? path.join(DOCS_DIR, found) : null;
}

function readMd(jsonPath) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    return data.pageContent || "";
  } catch {
    return "";
  }
}

// Parse "## Section : X" ou "## X" (style FR)
function parseFrenchSections(md) {
  const sections = [];
  const lines = md.split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(?:Section\s*:\s*)?(.+?)\s*$/);
    if (m) {
      if (cur) sections.push(cur);
      cur = { title: m[1].trim(), content: [] };
      continue;
    }
    if (cur && !line.startsWith("---")) cur.content.push(line);
    else if (line.startsWith("---") && cur) {
      sections.push(cur);
      cur = null;
    }
  }
  if (cur) sections.push(cur);
  return sections.map((s) => ({
    title: s.title,
    description: extractBOorFirstPara(s.content.join("\n")),
  }));
}

// Parse "**Title**\n\nparagraph" (style EN)
function parseEnglishSections(md) {
  const sections = [];
  const blocks = md.split(/\n---\n/);
  for (const block of blocks) {
    const m = block.match(/^\s*\*\*([^*\n]+)\*\*\s*\n+([\s\S]+)/);
    if (m) {
      sections.push({
        title: m[1].trim(),
        description: extractFirstSentence(m[2]),
      });
    }
  }
  return sections;
}

function extractBOorFirstPara(content) {
  // Cherche d'abord "### Attendus officiels (BO)" + bulletpoint ou texte
  const boMatch = content.match(/###\s+Attendus officiels[^\n]*\n+(?:>\s*)?([^\n]+(?:\n[^\n]+)*?)(?:\n\n|$)/);
  if (boMatch) {
    return cleanLine(boMatch[1]);
  }
  // Sinon programme officiel ou autre titre H3
  const h3Match = content.match(/###\s+[^\n]+\n+(?:>\s*)?([^\n]+)/);
  if (h3Match) return cleanLine(h3Match[1]);
  // Sinon 1ère phrase
  const trimmed = content.trim();
  return extractFirstSentence(trimmed);
}

function extractFirstSentence(text) {
  if (!text) return "";
  const cleaned = cleanLine(text.trim());
  const m = cleaned.match(/^(.{20,300}?[.!?])(\s|$)/);
  return m ? m[1] : cleaned.slice(0, 200);
}

function cleanLine(s) {
  return String(s)
    .replace(/^>\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*[-*]\s*/, "")
    .trim();
}

function buildObjectivesFromMd(thread) {
  const ragPath = findRagFile(thread.subchapterSlug);
  if (!ragPath) return { source: "fallback-no-md", objectives: bloomFallback(thread.name) };
  const md = readMd(ragPath);
  if (!md) return { source: "fallback-empty", objectives: bloomFallback(thread.name) };

  let sections = parseFrenchSections(md);
  let detected = "fr-h2";
  if (!sections || sections.length === 0) {
    sections = parseEnglishSections(md);
    detected = "en-bold";
  }
  if (!sections || sections.length === 0) {
    return { source: "fallback-no-sections", objectives: bloomFallback(thread.name) };
  }

  // Filtre titres parasites (vides, "Sources", "Notes" ...)
  const filtered = sections.filter((s) => s.title && s.title.length > 2 && !/^sources?$|^notes?$|^bibliographie$/i.test(s.title));
  if (filtered.length === 0) return { source: "fallback-trash-sections", objectives: bloomFallback(thread.name) };

  return {
    source: detected,
    objectives: filtered.slice(0, 8).map((s, i) => ({
      slug: slugify(s.title) || `section-${i + 1}`,
      title: s.title.slice(0, 120),
      description: (s.description || "").slice(0, 500) || null,
      orderIndex: i + 1,
    })),
  };
}

function bloomFallback(name) {
  return BLOOM_FALLBACK.map((b, i) => ({
    slug: b.slug,
    title: b.title,
    description: b.desc.replace("{{name}}", name || "ce sujet"),
    orderIndex: i + 1,
  }));
}

// ---------- Main ----------

async function main() {
  const excluded = await prisma.workspaces.findMany({
    where: { slug: { in: EXCLUDED_WORKSPACE_SLUGS } },
    select: { id: true },
  });
  const excludedIds = excluded.map((w) => w.id);

  let threads = await prisma.workspace_threads.findMany({
    where: { workspace_id: { notIn: excludedIds } },
    select: { id: true, name: true, subchapterSlug: true },
    orderBy: { id: "asc" },
  });
  if (LIMIT > 0) threads = threads.slice(0, LIMIT);

  console.log(`Threads à traiter : ${threads.length}`);
  console.log(`Mode : ${DRY_RUN ? "DRY-RUN" : "RÉEL"}\n`);

  const stats = {
    threadsTraités: 0,
    threadsSkipped: 0,
    objectivesCreated: 0,
    objectivesSkipped: 0,
    sources: {},
  };

  for (const t of threads) {
    stats.threadsTraités++;
    if (stats.threadsTraités % 100 === 0) {
      process.stdout.write(`  progress: ${stats.threadsTraités}/${threads.length}\n`);
    }

    const existing = await prisma.thread_objectives.count({ where: { threadId: t.id } });
    if (existing > 0) {
      stats.threadsSkipped++;
      continue;
    }

    const { source, objectives } = buildObjectivesFromMd(t);
    stats.sources[source] = (stats.sources[source] || 0) + 1;

    for (const obj of objectives) {
      if (DRY_RUN) {
        stats.objectivesCreated++;
        continue;
      }
      try {
        await prisma.thread_objectives.create({
          data: {
            threadId: t.id,
            slug: obj.slug,
            title: obj.title,
            description: obj.description,
            orderIndex: obj.orderIndex,
          },
        });
        stats.objectivesCreated++;
      } catch (err) {
        if (err.code === "P2002") stats.objectivesSkipped++;
        else console.error(`  ❌ thread ${t.id} slug=${obj.slug}: ${err.message}`);
      }
    }
  }

  console.log("\n--- Récap ---");
  console.log(`Threads traités    : ${stats.threadsTraités}`);
  console.log(`Threads skippés    : ${stats.threadsSkipped} (avaient déjà des objectifs)`);
  console.log(`Objectifs créés    : ${stats.objectivesCreated}`);
  console.log(`Objectifs skippés  : ${stats.objectivesSkipped}`);
  console.log(`\nRépartition par source :`);
  for (const [src, n] of Object.entries(stats.sources).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src.padEnd(28)} : ${n} threads`);
  }
  if (DRY_RUN) console.log(`\n(dry-run : aucune écriture)`);
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
