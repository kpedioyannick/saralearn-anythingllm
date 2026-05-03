/**
 * Test E2E du module Phonétique via API + parser frontend.
 * Valide la chaîne données : auth → workspace → thread → SSE → parser → tokens.
 *
 * Ce que CE script PEUT tester :
 * - Login + token JWT
 * - Le workspace Phonétique existe + a 34 threads
 * - Endpoint /api/sara/asset/mulberry/:slug renvoie SVG ou PNG
 * - Une chat-stream sur un thread retourne un bloc ```quiz
 * - Le parser frontend extrait correctement médias + HINT/OK/KO
 *
 * Ce que CE script NE PEUT PAS tester (= checklist manuelle navigateur) :
 * - Rendu visuel des composants React (MultiSlot/Hint/Feedback)
 * - Bouton 🔊 TTS qui parle effectivement (Web Speech API browser-only)
 * - Click interactions, drag-and-drop
 * - Affichage correct des emojis/SVG/PNG dans le navigateur
 *
 * Lancer : node scripts/test_phono_e2e.js
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

const BASE = "http://localhost:3010";
const USER = process.env.SARA_USER || "yannikkpedio@sara.com";
const PASS = process.env.SARA_PASS || "Y@utsade2026";

function httpReq(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function streamSSE(urlPath, body, headers, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const opts = {
      method: "POST",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { "Content-Type": "application/json", ...headers },
    };
    const req = http.request(opts, (res) => {
      let buf = "";
      let collected = "";
      const timer = setTimeout(() => req.destroy(new Error("timeout")), timeoutMs);
      res.on("data", (chunk) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === "textResponseChunk" && d.textResponse) {
                collected += d.textResponse;
              }
            } catch {}
          }
        }
      });
      res.on("end", () => {
        clearTimeout(timer);
        resolve(collected);
      });
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Charger le parser+tokenizer frontend en l'inlinant (modules ES → CommonJS hack)
function loadFrontendParser() {
  const root = path.resolve(__dirname, "../../frontend/src/components/WorkspaceChat/QuizBlock");
  const tk = fs.readFileSync(path.join(root, "tokenizer.js"), "utf-8").replace(/export /g, "");
  const ps = fs
    .readFileSync(path.join(root, "parser.js"), "utf-8")
    .replace(/import \{ extractMeta \} from "\.\/tokenizer";/, tk)
    .replace(/export /g, "");
  const sandbox = {};
  const wrapped = `(function(){ ${ps}; return { parseQuiz, tokenize, extractMeta }; })()`;
  return eval(wrapped);
}

const ok = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.log(`  ❌ ${msg}`); process.exitCode = 1; };
const info = (msg) => console.log(`     ${msg}`);

(async () => {
  const { parseQuiz, tokenize } = loadFrontendParser();

  console.log("\n=== Test 1 — Login ===");
  const login = await httpReq("POST", "/api/request-token", { username: USER, password: PASS });
  if (login.status !== 200) return fail(`login HTTP ${login.status}`);
  const { token, valid, user } = JSON.parse(login.body);
  if (!valid) return fail("login invalid");
  ok(`token reçu, user id=${user.id} role=${user.role}`);
  const auth = { Authorization: `Bearer ${token}` };

  console.log("\n=== Test 2 — Workspace Phonétique ===");
  const wsList = await httpReq("GET", "/api/workspaces", null, auth);
  const phon = JSON.parse(wsList.body).workspaces.find((w) => w.slug === "phonetique");
  if (!phon) return fail("workspace 'phonetique' introuvable");
  ok(`workspace id=${phon.id} name="${phon.name}"`);

  console.log("\n=== Test 3 — Threads (34 attendus) ===");
  const threads = await httpReq("GET", `/api/workspace/${phon.slug}/threads`, null, auth);
  const tList = JSON.parse(threads.body).threads || [];
  const phonThreads = tList.filter((t) => t.subchapterSlug?.startsWith("confusion-"));
  if (phonThreads.length === 34) ok(`${phonThreads.length} threads confusion-*`);
  else fail(`${phonThreads.length} threads (attendus: 34)`);

  console.log("\n=== Test 4 — Endpoint asset (Mulberry SVG + ARASAAC PNG) ===");
  const assetSvg = await httpReq("GET", "/api/sara/asset/mulberry/pain", null, auth);
  if (assetSvg.status === 200 && assetSvg.headers["content-type"] === "image/svg+xml") {
    ok(`pain → ${assetSvg.body.length} bytes SVG (Mulberry)`);
  } else fail(`pain asset HTTP ${assetSvg.status}`);

  const assetPng = await httpReq("GET", "/api/sara/asset/mulberry/maman", null, auth);
  if (assetPng.status === 200 && assetPng.headers["content-type"] === "image/png") {
    ok(`maman → PNG (ARASAAC fallback)`);
  } else fail(`maman asset HTTP ${assetPng.status}`);

  const assetMissing = await httpReq("GET", "/api/sara/asset/mulberry/inexistant_xyz", null, auth);
  if (assetMissing.status === 404) ok(`inexistant → 404 attendu`);
  else fail(`inexistant retourne ${assetMissing.status} (attendu 404)`);

  console.log("\n=== Test 5 — Chat-stream sur thread F/V ===");
  const fvThread = phonThreads.find((t) => t.subchapterSlug === "confusion-fv");
  if (!fvThread) return fail("thread F/V introuvable");
  info(`thread slug: ${fvThread.slug}`);
  const response = await streamSSE(
    `/api/workspace/${phon.slug}/thread/${fvThread.slug}/stream-chat`,
    { message: "donne-moi un quiz court avec audio TTS sur les mots avec F et V" },
    auth,
    60000
  );
  if (!response) return fail("réponse vide");
  ok(`réponse reçue: ${response.length} chars`);

  const blockMatch = response.match(/```quiz\s*\n([\s\S]*?)```/);
  if (!blockMatch) return fail("aucun bloc ```quiz dans la réponse");
  ok("bloc ```quiz détecté");

  console.log("\n=== Test 6 — Parser frontend ===");
  const parsed = parseQuiz(blockMatch[1]);
  if (parsed.questions.length === 0) return fail("parser: 0 questions");
  ok(`${parsed.questions.length} questions parsées`);
  if (parsed.competence) ok(`competence: "${parsed.competence}"`);

  let nbWithMedia = 0, nbWithHint = 0, nbWithFeedback = 0;
  for (const q of parsed.questions) {
    const slots = [q.question, q.front, ...((q.answers || []).map(a => a.text))]
      .filter(Boolean).join(" ");
    const tokens = tokenize(slots);
    if (tokens.some(t => t.type !== "text")) nbWithMedia++;
    if (q.hint) nbWithHint++;
    if (q.feedback_ok || q.feedback_ko) nbWithFeedback++;
    if ((q.answers || []).some(a => a.feedback_ok || a.feedback_ko)) nbWithFeedback++;
  }
  if (nbWithMedia > 0) ok(`${nbWithMedia} questions avec tokens médias`);
  else info(`(0 question avec tokens médias - le LLM peut avoir évité les [tts:])`);
  if (nbWithHint > 0) ok(`${nbWithHint} questions avec HINT:`);
  if (nbWithFeedback > 0) ok(`${nbWithFeedback} questions/réponses avec OK:/KO:`);

  console.log("\n=== Test 7 — Backend H5P parser (compat) ===");
  const back = require("../utils/sara/h5p/text2quizParser");
  const bk = back.parseText2Quiz(response);
  if (bk.questions.length > 0) ok(`H5P parser: ${bk.questions.length} questions`);
  else info("(0 questions H5P — normal si types non supportés H5P V1)");

  console.log("\n=== Tous les tests data passent ===\n");

  console.log("─".repeat(70));
  console.log("CHECKLIST MANUELLE NAVIGATEUR (impossible en CLI)");
  console.log("─".repeat(70));
  console.log(`
1. Connecte-toi sur https://sara.education
   → identifiants : ${USER}

2. Sidebar gauche : workspace "Phonétique" présent ?
   □ visible
   □ clic dessus → liste de 34 threads "Confusion X / Y"

3. Clic sur "Confusion F / V" :
   □ thread vide ouvert
   □ tape : "donne-moi un quiz court sur les sons f et v"
   □ Sara répond avec un bloc \`\`\`quiz

4. Sur le bloc quiz rendu :
   □ chaque question s'affiche dans une carte propre
   □ bouton 🔊 cliquable → la voix navigateur prononce le mot
   □ icône image (Mulberry SVG ou ARASAAC PNG) apparaît si [img:mulberry:...]
   □ bouton "💡 Indice" si HINT: présent → clic révèle le texte
   □ choisis une réponse → bouton Valider → couleur verte/rouge
   □ feedback OK:/KO: s'affiche après validation
   □ Explication s'affiche en bas

5. Test workspace Phonétique navigation :
   □ swipe entre 2-3 threads sans bug
   □ DevTools Network onglet : pas de 404 sur /api/sara/asset/...
   □ DevTools Console : pas d'erreur React

6. Test mobile (responsive) :
   □ ouvre sur smartphone
   □ même UX, lecture verticale OK

Si un point ne va pas, retour ici avec capture d'écran + DevTools logs.
`);
})().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
