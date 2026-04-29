// One-shot : ingestion du programme Brevet 2026 dans les workspaces
// coach-scolaire et brevet, + bump sessionMinutes 90 → 120.
//
// Étapes :
//   1. Génère un fichier JSON au format AnythingLLM dans
//      server/storage/documents/sara-programmes/programme-brevet-2026-<id>.json
//   2. Appelle Document.addDocuments() pour les 2 workspaces
//      (vectorise le contenu + crée les rows workspace_documents)
//   3. Patch users.userSettings (id=1) : plan.sessionMinutes 90 → 120
//
// Idempotent : si un document du même titre existe déjà sur un workspace,
// on ne ré-ingère pas (skip).

require("dotenv").config({ path: __dirname + "/../.env.development" });
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const prisma = require("../utils/prisma");
const Document = require("../models/documents").Document;

const SOURCE_MD = path.join(
  __dirname,
  "../storage/sara/programmes/programme-brevet-2026.md"
);
const DOC_FOLDER = "sara-programmes";
const DOCS_ROOT = path.join(__dirname, "../storage/documents");
const DOC_TITLE = "programme-brevet-2026.md";
const TARGET_SLUGS = ["coach-scolaire", "brevet"];
const TARGET_USER_ID = 1;

function fmtDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function ensureDocumentJson() {
  if (!fs.existsSync(SOURCE_MD)) throw new Error(`Source manquante : ${SOURCE_MD}`);
  const folder = path.join(DOCS_ROOT, DOC_FOLDER);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  // Si un fichier portant ce titre existe déjà dans le folder, on le réutilise.
  // Sinon on en crée un neuf avec un id frais.
  const existing = fs
    .readdirSync(folder)
    .map((f) => ({ f, full: path.join(folder, f) }))
    .filter(({ full }) => {
      try {
        const j = JSON.parse(fs.readFileSync(full, "utf8"));
        return j?.title === DOC_TITLE;
      } catch (_) {
        return false;
      }
    });
  if (existing.length > 0) {
    console.log(`[ingest-program] Document JSON existant : ${existing[0].f} — réutilisation`);
    return path.join(DOC_FOLDER, existing[0].f);
  }

  const pageContent = fs.readFileSync(SOURCE_MD, "utf8");
  const wordCount = pageContent.trim().split(/\s+/).length;
  const docId = uuidv4();
  const filename = `${path.basename(DOC_TITLE, ".md")}-${docId}.json`;
  const docJson = {
    id: docId,
    url: `file://${SOURCE_MD}`,
    title: DOC_TITLE,
    docAuthor: "Sara",
    description: "Programme Brevet 2026 — 8 semaines",
    docSource: "Programme pédagogique généré pour le coach scolaire.",
    chunkSource: "",
    published: fmtDate(new Date()),
    wordCount,
    pageContent,
  };
  fs.writeFileSync(path.join(folder, filename), JSON.stringify(docJson, null, 2));
  console.log(`[ingest-program] Document JSON créé : ${DOC_FOLDER}/${filename}`);
  return path.join(DOC_FOLDER, filename);
}

async function attachToWorkspace(slug, docPath) {
  const ws = await prisma.workspaces.findUnique({ where: { slug } });
  if (!ws) {
    console.error(`[ingest-program] Workspace ${slug} introuvable — skip`);
    return;
  }
  const already = await prisma.workspace_documents.findFirst({
    where: { workspaceId: ws.id, docpath: docPath },
  });
  if (already) {
    console.log(`[ingest-program] Déjà attaché à ${slug} (id=${ws.id}) — skip`);
    return;
  }
  console.log(`[ingest-program] Vectorisation pour ${slug} (id=${ws.id})…`);
  const result = await Document.addDocuments(ws, [docPath], TARGET_USER_ID);
  if (result.failedToEmbed.length > 0) {
    console.error(`[ingest-program] ÉCHEC vectorisation ${slug} :`, result.failedToEmbed, result.errors);
  } else {
    console.log(`[ingest-program] OK — ${result.embedded.length} doc(s) embarqué(s) dans ${slug}`);
  }
}

async function bumpSessionMinutes() {
  const u = await prisma.users.findUnique({ where: { id: TARGET_USER_ID } });
  if (!u) return;
  let settings = {};
  try { settings = JSON.parse(u.userSettings || "{}"); } catch (_) {}
  if (settings.coaching?.plan) {
    if (settings.coaching.plan.sessionMinutes !== 120) {
      settings.coaching.plan.sessionMinutes = 120;
      await prisma.users.update({
        where: { id: TARGET_USER_ID },
        data: { userSettings: JSON.stringify(settings) },
      });
      console.log(`[ingest-program] sessionMinutes → 120 pour user=${TARGET_USER_ID}`);
    } else {
      console.log(`[ingest-program] sessionMinutes déjà à 120`);
    }
  }
}

(async () => {
  try {
    const docPath = await ensureDocumentJson();
    for (const slug of TARGET_SLUGS) await attachToWorkspace(slug, docPath);
    await bumpSessionMinutes();
    console.log("[ingest-program] OK");
  } catch (e) {
    console.error("[ingest-program] ERR:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
