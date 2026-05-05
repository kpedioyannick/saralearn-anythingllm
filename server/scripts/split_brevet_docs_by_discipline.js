/**
 * Split des documents indexés HGE et Sciences du workspace Brevet par discipline.
 *
 * HGE 2022-2025 (4 fichiers) → Histoire / Géographie / EMC (jusqu'à 12 fichiers)
 *   Classification via le champ `competence:` de chaque bloc ```probleme.
 *
 * Sciences 2022-2025 (4 fichiers) → Physique-Chimie / SVT / Technologie (jusqu'à 12 fichiers)
 *   Classification via le tag dans `titre:` (ex. "Brevet 2024 PC — Question 1").
 *
 * Pipeline :
 *  Phase A — génère les nouveaux fichiers JSON sur disque (custom-documents/)
 *  Phase B — indexe via Document.addDocuments (vectorisation LanceDB)
 *  Phase C — désindexe les 8 fichiers originaux via Document.removeDocuments
 *  Phase D — supprime les fichiers JSON originaux du disque
 *
 * Lancer : node scripts/split_brevet_docs_by_discipline.js
 *          node scripts/split_brevet_docs_by_discipline.js --dry-run
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { Document } = require("../models/documents");

const DRY_RUN = process.argv.includes("--dry-run");
const WORKSPACE_ID = 187;
const DOCS_DIR = "/var/www/saralearn-anythingllm/server/storage/documents";
const CUSTOM_DIR = path.join(DOCS_DIR, "custom-documents");

const FENCE = "```";

function classifyHGE(competence) {
  const c = competence.toLowerCase();
  if (c.includes("histoire") || c.includes("historique")) return "Histoire";
  if (c.includes("géographie") || c.includes("geographie") || c.includes("géographique") || c.includes("geographique")) return "Géographie";
  if (c.includes("emc") || c.includes("moral") || c.includes("civique")) return "EMC";
  return null;
}

function classifySciences(titre) {
  const m = titre.match(/Brevet \d+ ([^—]+) —/);
  if (!m) return null;
  const tag = m[1].trim().toLowerCase();
  if (tag === "pc" || tag.includes("physique")) return "Physique-Chimie";
  if (tag === "svt") return "SVT";
  if (tag === "techno" || tag.includes("technolog")) return "Technologie";
  return null;
}

function parseBlocks(pageContent) {
  const parts = pageContent.split(new RegExp(`(?=${FENCE.replace(/`/g, "\\`")}probleme)`));
  const header = parts[0] || "";
  const blocks = parts.slice(1);
  return { header, blocks };
}

function slugifyDiscipline(d) {
  return d.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildNewFile(year, discipline, blocks, originalDocSource) {
  const id = crypto.randomUUID();
  const disciplineSlug = slugifyDiscipline(discipline);
  const filename = `raw-brevet-${year}-${disciplineSlug}-text2quiz-${id}.json`;
  const header = `# Brevet ${year} — ${discipline}\nClasse : 3ème | Session : ${year}\n\n`;
  const pageContent = header + blocks.join("");
  const wordCount = pageContent.split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.ceil(pageContent.length / 4);
  const data = {
    id,
    url: `file://brevet-${year}-${disciplineSlug}-text2quiz.txt`,
    title: `brevet-${year}-${disciplineSlug}-text2quiz.txt`,
    docAuthor: "Annales DNB",
    description: `Annales Brevet ${year} — ${discipline} (text2quiz)`,
    docSource: originalDocSource || "brevet-text2quiz-2026-04-24",
    chunkSource: `brevet-${year}-${disciplineSlug}-text2quiz.txt`,
    published: new Date().toISOString(),
    wordCount,
    pageContent,
    token_count_estimate: tokenEstimate,
  };
  return { filename, data };
}

async function main() {
  console.log(`\n=== Brevet docs split — ${DRY_RUN ? "DRY RUN" : "EXECUTE"} ===\n`);

  const docs = await prisma.workspace_documents.findMany({
    where: { workspaceId: WORKSPACE_ID },
  });
  const hgeDocs = docs.filter(d => /raw-brevet-\d+-hge-/.test(d.filename));
  const sciDocs = docs.filter(d => /raw-brevet-\d+-sciences-/.test(d.filename));
  console.log(`Sources : ${hgeDocs.length} HGE + ${sciDocs.length} Sciences\n`);

  // ============ PHASE A — génération des nouveaux fichiers ============
  console.log(`--- PHASE A : génération nouveaux JSON ---\n`);
  const newFiles = []; // { filename, year, discipline, originalDocPath }

  for (const doc of [...hgeDocs, ...sciDocs]) {
    const fullPath = path.join(DOCS_DIR, doc.docpath);
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ Fichier introuvable : ${fullPath}`);
      continue;
    }
    const json = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const yearMatch = doc.filename.match(/raw-brevet-(\d+)/);
    const year = yearMatch ? yearMatch[1] : "????";
    const isHGE = /raw-brevet-\d+-hge-/.test(doc.filename);

    const { blocks } = parseBlocks(json.pageContent || "");
    const grouped = {};
    for (const block of blocks) {
      let discipline = null;
      if (isHGE) {
        const compMatch = block.match(/competence:\s*(.+?)\n/);
        discipline = compMatch ? classifyHGE(compMatch[1]) : null;
      } else {
        const titreMatch = block.match(/titre:\s*(.+?)\n/);
        discipline = titreMatch ? classifySciences(titreMatch[1]) : null;
      }
      if (!discipline) {
        console.warn(`  ⚠️  Bloc non classé dans ${doc.filename}`);
        continue;
      }
      if (!grouped[discipline]) grouped[discipline] = [];
      grouped[discipline].push(block);
    }

    for (const [discipline, blks] of Object.entries(grouped)) {
      const { filename, data } = buildNewFile(year, discipline, blks, json.docSource);
      const newPath = path.join(CUSTOM_DIR, filename);
      if (DRY_RUN) {
        console.log(`  [DRY] créerait ${filename} (${blks.length} blocs, ${data.wordCount} mots)`);
      } else {
        fs.writeFileSync(newPath, JSON.stringify(data, null, 2));
        console.log(`  ✅ ${filename} (${blks.length} blocs)`);
      }
      newFiles.push({
        relPath: `custom-documents/${filename}`,
        year, discipline, blocksCount: blks.length,
        sourceFilename: doc.filename,
      });
    }
  }

  console.log(`\n  Total nouveaux fichiers : ${newFiles.length}`);

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Phases B/C/D non exécutées.`);
    return;
  }

  // ============ PHASE B — indexation ============
  console.log(`\n--- PHASE B : indexation + vectorisation ---\n`);
  const workspace = await prisma.workspaces.findUnique({ where: { id: WORKSPACE_ID } });
  const addPaths = newFiles.map(nf => nf.relPath);
  const addResult = await Document.addDocuments(workspace, addPaths, null);
  console.log(`  Embedded : ${(addResult.embedded || []).length}`);
  if ((addResult.failedToEmbed || []).length) {
    console.error(`  Failed : ${addResult.failedToEmbed.length}`);
    for (const f of addResult.failedToEmbed) console.error(`    - ${f}`);
  }

  // ============ PHASE C — désindexation des originaux ============
  console.log(`\n--- PHASE C : désindexation 8 fichiers source ---\n`);
  const removePaths = [...hgeDocs, ...sciDocs].map(d => d.docpath);
  const removeResult = await Document.removeDocuments(workspace, removePaths, null);
  console.log(`  Removed : ${removePaths.length} (vectors + DB)`);
  if (removeResult && removeResult.errors && removeResult.errors.size) {
    console.error(`  Errors :`, [...removeResult.errors]);
  }

  // ============ PHASE D — cleanup fichiers disque ============
  console.log(`\n--- PHASE D : suppression JSON sources sur disque ---\n`);
  for (const doc of [...hgeDocs, ...sciDocs]) {
    const fullPath = path.join(DOCS_DIR, doc.docpath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  🗑️  ${doc.filename}`);
    }
  }

  // ============ RÉCAP ============
  console.log(`\n=== RÉCAPITULATIF ===\n`);
  const finalDocs = await prisma.workspace_documents.findMany({
    where: { workspaceId: WORKSPACE_ID },
    orderBy: { id: "asc" },
  });
  console.log(`Documents indexés brevet (workspace 187) : ${finalDocs.length}`);
  const byDiscipline = {};
  for (const d of finalDocs) {
    const m = d.filename.match(/raw-brevet-\d+-([a-z-]+)-text2quiz/);
    const tag = m ? m[1] : "autre";
    byDiscipline[tag] = (byDiscipline[tag] || 0) + 1;
  }
  for (const [k, v] of Object.entries(byDiscipline).sort()) {
    console.log(`  ${v}x ${k}`);
  }
}

main()
  .catch(e => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
