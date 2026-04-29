// Test du workspace Coach Scolaire via l'API HTTP réelle (au lieu d'appels
// internes). Génère un JWT signé avec JWT_SECRET, puis :
//   1. Liste les workspaces visibles pour user 1 → coach-scolaire doit apparaître
//   2. Envoie un message chat au workspace coach et vérifie la réponse
//
// N'utilise PAS le password de l'utilisateur — signe un JWT directement avec
// le secret serveur, ce qui est l'équivalent côté serveur d'un login réussi.

require("dotenv").config({ path: __dirname + "/../.env.development" });
const fetch = require("node-fetch");
const JWT = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const BASE = "http://localhost:3010/api";
const TARGET_USER_ID = 1;

async function buildToken() {
  const u = await prisma.users.findUnique({ where: { id: TARGET_USER_ID } });
  if (!u) throw new Error(`User ${TARGET_USER_ID} introuvable`);
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET manquant");
  return JWT.sign(
    { id: u.id, username: u.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "30d" }
  );
}

async function listWorkspaces(token) {
  const r = await fetch(`${BASE}/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    console.error(`HTTP ${r.status}`, await r.text());
    return null;
  }
  const j = await r.json();
  return j.workspaces || [];
}

async function chatWithCoach(token, slug, message) {
  const r = await fetch(`${BASE}/workspace/${slug}/stream-chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message, attachments: [] }),
  });
  if (!r.ok) {
    console.error(`HTTP ${r.status}`, await r.text());
    return null;
  }
  // Le stream renvoie des chunks "data: {json}\n\n" — on accumule textResponse.
  let full = "";
  let buffer = "";
  for await (const chunk of r.body) {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!raw.startsWith("data:")) continue;
      const json = raw.slice(5).trim();
      try {
        const evt = JSON.parse(json);
        if (evt.type === "textResponseChunk" && typeof evt.textResponse === "string") {
          full += evt.textResponse;
        } else if (evt.type === "textResponse" && typeof evt.textResponse === "string") {
          // Bloc complet (réponses non-stream comme H5P/video, ou normalisations)
          full = evt.textResponse;
        }
        if (evt.close === true) return full;
      } catch (_) {}
    }
  }
  return full;
}

(async () => {
  const token = await buildToken();
  console.log("✅ JWT signé\n");

  console.log("=== Workspaces visibles pour user 1 ===");
  const ws = await listWorkspaces(token);
  if (!ws) { process.exit(1); }
  for (const w of ws) {
    const tag = w.slug === "coach-scolaire" ? " ← COACH" : "";
    console.log(`  [${w.id.toString().padStart(3)}] ${w.slug.padEnd(35)} ${w.name}${tag}`);
  }
  const coach = ws.find((w) => w.slug === "coach-scolaire");
  if (!coach) { console.error("❌ coach-scolaire absent"); process.exit(1); }
  console.log(`\n✅ Coach Scolaire visible (id=${coach.id})\n`);

  const PROMPTS = [
    "Qu'est-ce que j'ai à faire aujourd'hui ?",
    "Quel est mon programme pour la semaine 3 ?",
    "Fais-moi une fiche sur Pythagore",
  ];
  for (const p of PROMPTS) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`▶ User: "${p}"`);
    const t0 = Date.now();
    const txt = await chatWithCoach(token, "coach-scolaire", p);
    if (!txt) continue;
    console.log(`  (${Date.now() - t0}ms, ${txt.length} chars)`);
    console.log(`  ─ Réponse coach ─`);
    console.log(txt.split("\n").map((l) => "  | " + l).join("\n"));
    const hasBlock = /```(fiche|quiz|probleme|video|dictee|markmap|book|flashcards|h5p)/i.test(txt);
    console.log(`  ${hasBlock ? "❌ BLOC PÉDAGOGIQUE DÉTECTÉ" : "✅ pas de bloc pédagogique"}`);
  }

  await prisma.$disconnect();
})();
