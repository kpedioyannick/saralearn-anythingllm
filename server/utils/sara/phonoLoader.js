/**
 * Loader MD pour les threads dys-phono (workspace "Phonétique").
 *
 * Quand un élève entre dans un thread `confusion-*`, on charge le fichier MD
 * correspondant et on l'injecte dans le system prompt LLM. Sara peut ainsi :
 * - Décrire l'articulation du phonème
 * - Réutiliser les exos prêts à l'emploi (```quiz, ```dictee)
 * - Adapter le niveau et la difficulté aux demandes de l'élève
 *
 * Le matching se fait via `thread.subchapterSlug` qui doit correspondre exactement
 * au nom de fichier (sans .md). Ex: `confusion-pb` → `confusion-pb.md`.
 */

const fs = require("fs");
const path = require("path");

const MD_DIR = path.resolve(__dirname, "../../storage/sara/dys/phono");
// Cache simple : MD chargés une fois et gardés en mémoire pour la durée de vie
// du process. Invalidé sur restart du serveur (changement MD = pm2 restart).
const cache = new Map();

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { meta: {}, body: content };
  const metaStr = m[1];
  const body = content.slice(m[0].length);
  const meta = {};
  for (const line of metaStr.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body };
}

function parseSections(body) {
  // Sépare sur `## ` (en début de ligne). On garde le titre + le corps.
  // La 1ère "section" (avant tout ##) est la description du thread.
  const sections = [];
  const parts = body.split(/^## /m);
  if (parts[0].trim()) {
    sections.push({
      title: null,
      slug: null,
      order: 0,
      content: parts[0].trim(),
    });
  }
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const firstNL = part.indexOf("\n");
    const title = (firstNL >= 0 ? part.slice(0, firstNL) : part).trim();
    const content = firstNL >= 0 ? part.slice(firstNL + 1) : "";
    const slugMatch = content.match(/<!--\s*slug:\s*([\w-]+)\s*-->/);
    const orderMatch = content.match(/<!--\s*order:\s*(\d+)\s*-->/);
    sections.push({
      title,
      slug: slugMatch ? slugMatch[1] : null,
      order: orderMatch ? parseInt(orderMatch[1], 10) : i,
      content: content.trim(),
    });
  }
  return sections;
}

function loadMd(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const mdPath = path.join(MD_DIR, `${slug}.md`);
  if (!fs.existsSync(mdPath)) {
    cache.set(slug, null);
    return null;
  }
  try {
    const content = fs.readFileSync(mdPath, "utf-8");
    const { meta, body } = parseFrontmatter(content);
    const sections = parseSections(body);
    const parsed = { meta, sections };
    cache.set(slug, parsed);
    return parsed;
  } catch (err) {
    console.error(`[phonoLoader] erreur lecture ${mdPath}:`, err.message);
    cache.set(slug, null);
    return null;
  }
}

/**
 * Devine quel(s) objectif(s) sont pertinents pour le message de l'élève.
 * Heuristique simple par mots-clés. Si rien ne match, on retourne null
 * (ce qui signifie "donne tout le contenu").
 */
function pickRelevantObjective(message) {
  if (!message) return null;
  const lc = message.toLowerCase();
  if (/articul|prononc|bouche|langue|gorge|vibr/i.test(lc)) return "articulation";
  if (/écout|entend|distingu|son|audi|oreille|tts|audio/i.test(lc)) return "discrimination";
  if (/lir|lecture|lis|lit/i.test(lc)) return "lecture";
  if (/dessin|image|nomm|illustr/i.test(lc)) return "production-mot";
  if (/phras|verb|dict[eé]|écri[stv]|complét/i.test(lc)) return "production-phrase";
  return null;
}

/**
 * Construit le bloc de contexte injecté dans le system prompt.
 * Si `message` est fourni et qu'il pointe vers un objectif précis, on injecte
 * surtout cet objectif (mais on garde la description + les autres titres pour
 * que le LLM sache ce qui existe).
 */
function buildPromptBlock(parsed, message = "") {
  if (!parsed) return null;
  const { meta, sections } = parsed;

  const focused = pickRelevantObjective(message);
  const lines = [];

  lines.push("# Contexte pédagogique dys-phono");
  lines.push(`Tu accompagnes un élève sur la confusion phonétique : **${meta.title}**.`);
  if (meta.description) lines.push(meta.description);
  lines.push("");
  lines.push("Voici le contenu pédagogique préparé pour cette confusion. **Réutilise les exercices ci-dessous tels quels** (ne les invente pas), ou adapte-les au niveau et à la demande de l'élève.");
  lines.push("");

  // On donne TOUJOURS l'articulation + la liste des objectifs pour que Sara
  // puisse switcher d'objectif si l'élève change de sujet.
  for (const s of sections) {
    if (!s.title) {
      // Description brute (avant le 1er ##)
      lines.push(s.content);
      lines.push("");
      continue;
    }
    const isFocused = focused && s.slug && s.slug.endsWith(`-${focused}`);
    const isMandatory = s.order === 1; // articulation toujours utile
    if (focused && !isFocused && !isMandatory) {
      // Compress : juste le titre + slug
      lines.push(`## ${s.title}`);
      lines.push(`<!-- slug: ${s.slug || ""}, order: ${s.order} -->`);
      lines.push(`(contenu disponible — demande à l'élève s'il veut passer à cet objectif)`);
      lines.push("");
    } else {
      // Full content
      lines.push(`## ${s.title}`);
      if (s.content) {
        lines.push(s.content);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("Réponds dans la langue de l'élève. Si tu génères un exo, copie un des blocs ```quiz / ```dictee ci-dessus, en l'adaptant si besoin.");
  return lines.join("\n");
}

/**
 * API publique. Renvoie une string prête à injecter dans le system prompt,
 * ou null si :
 * - le thread n'est pas un thread `confusion-*`
 * - le fichier MD n'existe pas
 * - l'élève n'est pas dans le workspace "phonetique"
 */
async function loadPhonoContext(workspace, thread, message = "") {
  if (!workspace || workspace.slug !== "phonetique") return null;
  if (!thread?.subchapterSlug?.startsWith("confusion-")) return null;
  const parsed = loadMd(thread.subchapterSlug);
  if (!parsed) return null;
  return buildPromptBlock(parsed, message);
}

/**
 * Pour debug/tests : vide le cache. À appeler si on modifie un MD à chaud.
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  loadPhonoContext,
  clearCache,
  // exports internes pour tests
  _internal: { parseFrontmatter, parseSections, pickRelevantObjective, loadMd },
};
