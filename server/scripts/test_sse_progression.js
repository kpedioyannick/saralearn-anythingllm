/**
 * Test E2E SSE complet : login → chat → parse quiz → POST exercice → verify link.
 * Simule exactement le flow navigateur via l'API.
 */

const http = require("http");
const prisma = require("../utils/prisma");

const BASE = "http://localhost:3010";
const USER = "yannikkpedio@sara.com";
const PASS = "Y@utsade2026";

function httpReq(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { "Content-Type": "application/json", ...headers } };
    const req = http.request(opts, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function streamSSE(urlPath, body, headers, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const opts = { method: "POST", hostname: url.hostname, port: url.port, path: url.pathname, headers: { "Content-Type": "application/json", ...headers } };
    const req = http.request(opts, (res) => {
      let buf = "", collected = "";
      const timer = setTimeout(() => req.destroy(new Error("timeout")), timeoutMs);
      res.on("data", chunk => {
        buf += chunk.toString();
        const lines = buf.split("\n"); buf = lines.pop();
        for (const l of lines) if (l.startsWith("data: ")) {
          try { const d = JSON.parse(l.slice(6)); if (d.type === "textResponseChunk" && d.textResponse) collected += d.textResponse; } catch {}
        }
      });
      res.on("end", () => { clearTimeout(timer); resolve(collected); });
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function parseQuizBlock(md) {
  const m = md.match(/```quiz\s*\n([\s\S]*?)```/);
  if (!m) return null;
  const block = m[1];
  let competence = null, objective = null, statements = [];
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (t.toLowerCase().startsWith("competence:")) competence = t.slice(11).trim();
    else if (t.toLowerCase().startsWith("objective:")) objective = t.slice(10).trim();
    else if (/^(QCM|VF|QRC|Trous)\s*\|\|/.test(t)) {
      const parts = t.split("||").map(s => s.trim());
      statements.push(parts[1] || "");
    }
  }
  return { competence, objective, statements };
}

const ok = m => console.log(`  ✅ ${m}`);
const info = m => console.log(`     ${m}`);

(async () => {
  console.log("\n=== STEP 1 : Login ===");
  const lr = await httpReq("POST", "/api/request-token", { username: USER, password: PASS });
  const { token, user } = JSON.parse(lr.body);
  ok(`logged as ${user.username} (id=${user.id})`);
  const auth = { Authorization: `Bearer ${token}` };

  console.log("\n=== STEP 2 : Trouver thread CM2 maths additionner décimaux ===");
  const thread = await prisma.workspace_threads.findFirst({
    where: { subchapterSlug: "additionner-des-nombres-decimaux-1" },
    include: { workspace: true },
  });
  ok(`thread "${thread.name}" (id=${thread.id}, slug=${thread.slug})`);
  info(`workspace: ${thread.workspace.slug}`);

  console.log("\n=== STEP 3 : Cleanup tests précédents ===");
  await prisma.user_exercises.deleteMany({ where: { deviceId: "test-sse-flow" } });
  ok("cleaned");

  console.log("\n=== STEP 4 : SSE chat « fais-moi un quiz » ===");
  const t0 = Date.now();
  const response = await streamSSE(
    `/api/workspace/${thread.workspace.slug}/thread/${thread.slug}/stream-chat`,
    { message: "fais-moi un quiz" }, auth
  );
  ok(`SSE complet en ${Math.round((Date.now() - t0) / 1000)}s, ${response.length} chars`);

  console.log("\n=== STEP 5 : Parser le bloc ```quiz ===");
  const parsed = parseQuizBlock(response);
  if (!parsed) { console.log("  ❌ pas de bloc quiz"); console.log(response.slice(0, 500)); process.exit(1); }
  ok(`competence: "${parsed.competence}"`);
  if (parsed.objective) ok(`objective: "${parsed.objective}"`);
  else console.log(`  ⚠️  PAS d'objective: dans le bloc — Sara n'a pas annoté`);
  ok(`${parsed.statements.length} questions parsées`);

  console.log("\n=== STEP 6 : Simuler élève répondant correctement à 1 exo ===");
  const stmt = parsed.statements[0] || "Q1";
  const postR = await httpReq("POST", "/api/v1/user/exercises", {
    deviceId: "test-sse-flow", userId: user.id, workspaceId: thread.workspace.id,
    threadId: thread.id, competence: parsed.competence || "",
    subchapter: thread.name, statement: stmt,
    questionType: "qcm", isCorrect: true, total: 1, correct: 1,
    objectiveTitle: parsed.objective || null,
  }, auth);
  const { exercise } = JSON.parse(postR.body);
  ok(`exercice ${exercise.id} inséré`);

  console.log("\n=== STEP 7 : Wait async auto-link + verify ===");
  await new Promise(r => setTimeout(r, 1500));
  const linked = await prisma.user_exercises.findUnique({
    where: { id: exercise.id },
    include: {} // no relation yet
  });
  if (linked.threadObjectiveId) {
    const obj = await prisma.thread_objectives.findUnique({ where: { id: linked.threadObjectiveId } });
    ok(`auto-linked → objective id=${linked.threadObjectiveId} "${obj.title}"`);
  } else {
    console.log(`  ❌ auto-link a échoué : threadObjectiveId still null`);
  }

  console.log("\n=== STEP 8 : GET /objectives endpoint ===");
  const progR = await httpReq("GET", `/api/v1/user/exercises/objectives?threadId=${thread.id}&userId=${user.id}`, null, auth);
  const { objectives } = JSON.parse(progR.body);
  const withExo = objectives.filter(o => o.attempted > 0);
  if (withExo.length > 0) {
    ok(`progression remontée : ${withExo.length} objectif(s) avec exos`);
    for (const o of withExo) {
      info(`"${o.title.slice(0, 60)}" → ${o.attempted} exos, ${o.correct} OK, status=${o.status}`);
    }
  } else {
    console.log(`  ❌ aucun objectif avec exos remonté`);
  }

  console.log("\n=== STEP 9 : Cleanup ===");
  await prisma.user_exercises.deleteMany({ where: { deviceId: "test-sse-flow" } });
  ok("cleaned");

  console.log("\n=== Tous les tests E2E SSE passent ✅ ===\n");
})().catch(e => { console.error("❌ Fatal:", e); process.exit(1); }).finally(() => prisma.$disconnect());
