/**
 * Seed `thread_objectives` en générant les objectifs via l'intent `objectifs`
 * fraîchement créé. Pour chaque thread :
 *   1. Skip s'il a déjà des objectifs (idempotent)
 *   2. Appelle /api/workspace/<ws>/thread/<slug>/stream-chat avec
 *      "quels sont les objectifs de ce chapitre"
 *   3. Parse la liste markdown produite par l'intent objectifs
 *   4. Insère 3-6 objectifs en DB (slug = slugify du verbe+phrase)
 *
 * Idempotent. Concurrent 5 threads en parallèle.
 *
 * Lancer :
 *   node scripts/seed_objectives_via_llm.js [--dry-run] [--limit=N]
 *                                           [--workspace=slug] [--concurrency=N]
 */

const http = require("http");
const prisma = require("../utils/prisma");

const BASE = "http://localhost:3010";
const USER = process.env.SARA_USER || "yannikkpedio@sara.com";
const PASS = process.env.SARA_PASS || "Y@utsade2026";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10);
const ONLY_WS = args.find((a) => a.startsWith("--workspace="))?.split("=")[1] || null;
const CONCURRENCY = parseInt(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || "5", 10);
const EXCLUDED_WORKSPACE_SLUGS = ["phonetique", "coach-scolaire"];

function httpReq(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...headers },
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
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
              if (d.type === "textResponseChunk" && d.textResponse) collected += d.textResponse;
            } catch {}
          }
        }
      });
      res.on("end", () => { clearTimeout(timer); resolve(collected); });
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['']/g, "").replace(/[^\w\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-")
    .slice(0, 60);
}

/**
 * Parse une réponse Sara au format :
 *   ## 🎯 Objectifs d'apprentissage — Titre
 *
 *   - **Verbe** description...
 *   - **Verbe** description...
 *
 * Renvoie [{verb, description, fullLine}, ...]
 */
function parseObjectivesList(md) {
  const lines = md.split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    // Match: "- **Verbe** texte" ou "* **Verbe** texte" ou "1. **Verbe** texte"
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+\*\*([^*]+)\*\*\s*(.+?)\s*$/);
    if (m) {
      const verb = m[1].trim();
      const description = m[2].trim();
      items.push({
        verb,
        description,
        fullLine: `${verb} ${description}`,
      });
    }
  }
  return items;
}

async function login() {
  const r = await httpReq("POST", "/api/request-token", { username: USER, password: PASS });
  if (r.status !== 200) throw new Error(`Login failed: HTTP ${r.status}`);
  const { token, valid } = JSON.parse(r.body);
  if (!valid) throw new Error("Login invalid");
  return token;
}

async function processThread(thread, workspace, auth) {
  const existing = await prisma.thread_objectives.count({ where: { threadId: thread.id } });
  if (existing > 0) return { thread: thread.id, status: "skip", count: existing };

  let response;
  try {
    response = await streamSSE(
      `/api/workspace/${workspace.slug}/thread/${thread.slug}/stream-chat`,
      { message: "quels sont les objectifs de ce chapitre" },
      auth,
      90000
    );
  } catch (e) {
    return { thread: thread.id, status: "stream_error", error: e.message };
  }
  if (!response) return { thread: thread.id, status: "empty_response" };

  const items = parseObjectivesList(response);
  if (items.length === 0) return { thread: thread.id, status: "no_parse", preview: response.slice(0, 200) };

  if (DRY_RUN) {
    return { thread: thread.id, status: "dry_ok", count: items.length, sample: items.slice(0, 2) };
  }

  // Insert with conflict-safe slugs (append idx if collision)
  const used = new Set();
  let inserted = 0;
  for (let i = 0; i < items.length; i++) {
    let slug = slugify(items[i].verb + "-" + items[i].description);
    if (!slug || slug.length < 3) slug = `obj-${i + 1}`;
    let finalSlug = slug;
    let suffix = 2;
    while (used.has(finalSlug)) finalSlug = `${slug}-${suffix++}`;
    used.add(finalSlug);
    try {
      await prisma.thread_objectives.create({
        data: {
          threadId: thread.id,
          slug: finalSlug,
          title: items[i].fullLine.slice(0, 200),
          description: items[i].description.slice(0, 500),
          orderIndex: i + 1,
        },
      });
      inserted++;
    } catch (err) {
      if (err.code !== "P2002") {
        console.error(`  ❌ thread ${thread.id} slug=${finalSlug}: ${err.message}`);
      }
    }
  }
  return { thread: thread.id, status: "ok", count: inserted };
}

async function processBatch(threads, workspaceMap, auth) {
  return Promise.all(
    threads.map((t) => processThread(t, workspaceMap[t.workspace_id], auth))
  );
}

async function main() {
  console.log(`Mode : ${DRY_RUN ? "DRY-RUN" : "RÉEL"}, concurrency=${CONCURRENCY}${LIMIT ? `, limit=${LIMIT}` : ""}${ONLY_WS ? `, workspace=${ONLY_WS}` : ""}`);

  const auth = { Authorization: `Bearer ${await login()}` };
  console.log("✓ Login OK");

  const excluded = await prisma.workspaces.findMany({
    where: { slug: { in: EXCLUDED_WORKSPACE_SLUGS } },
    select: { id: true },
  });
  const excludedIds = excluded.map((w) => w.id);

  const wsFilter = { id: { notIn: excludedIds } };
  if (ONLY_WS) wsFilter.slug = ONLY_WS;
  const workspaces = await prisma.workspaces.findMany({
    where: wsFilter,
    select: { id: true, slug: true, name: true },
  });
  const wsMap = Object.fromEntries(workspaces.map((w) => [w.id, w]));
  const wsIds = workspaces.map((w) => w.id);

  let threads = await prisma.workspace_threads.findMany({
    where: { workspace_id: { in: wsIds } },
    select: { id: true, name: true, slug: true, subchapterSlug: true, workspace_id: true },
    orderBy: { id: "asc" },
  });
  if (LIMIT > 0) threads = threads.slice(0, LIMIT);

  console.log(`Threads à traiter : ${threads.length} (sur ${workspaces.length} workspaces)\n`);

  const stats = { ok: 0, skip: 0, no_parse: 0, empty: 0, error: 0, total_obj: 0 };
  const t0 = Date.now();

  // Process by chunks of CONCURRENCY
  for (let i = 0; i < threads.length; i += CONCURRENCY) {
    const chunk = threads.slice(i, i + CONCURRENCY);
    const results = await processBatch(chunk, wsMap, auth);
    for (const r of results) {
      if (r.status === "ok" || r.status === "dry_ok") { stats.ok++; stats.total_obj += r.count; }
      else if (r.status === "skip") stats.skip++;
      else if (r.status === "no_parse") {
        stats.no_parse++;
        console.log(`  ⚠️  ${r.thread} no_parse — preview:`, (r.preview || "").replace(/\n/g, " ").slice(0, 120));
      } else if (r.status === "empty_response") stats.empty++;
      else stats.error++;
    }
    const elapsed = Math.round((Date.now() - t0) / 1000);
    const done = i + chunk.length;
    const eta = Math.round((elapsed / done) * (threads.length - done));
    process.stdout.write(`  ${done}/${threads.length} threads (ok:${stats.ok} skip:${stats.skip} parse_fail:${stats.no_parse} err:${stats.error}) — ${elapsed}s elapsed, ETA ${eta}s\r`);
  }

  console.log(`\n\n--- Récap ---`);
  console.log(`Threads OK         : ${stats.ok}`);
  console.log(`Threads skippés    : ${stats.skip} (avaient déjà des objectifs)`);
  console.log(`Parse fails        : ${stats.no_parse} (LLM réponse pas au format attendu)`);
  console.log(`Empty responses    : ${stats.empty}`);
  console.log(`Errors             : ${stats.error}`);
  console.log(`Total objectifs    : ${stats.total_obj}`);
  console.log(`Temps total        : ${Math.round((Date.now() - t0) / 1000)}s`);
  if (DRY_RUN) console.log(`(dry-run : aucune écriture)`);
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
