const prisma = require("../prisma");

function safeParseSettings(raw) {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeAssigned(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const workspaceSlug = String(entry.workspaceSlug || "").trim();
    const threadSlug = String(entry.threadSlug || "").trim();
    if (!workspaceSlug || !threadSlug) continue;
    const key = `${workspaceSlug}::${threadSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ workspaceSlug, threadSlug });
  }
  return out;
}

async function mutateUserSettings(userId, mutator) {
  const id = parseInt(userId);
  if (!id) throw new Error("Invalid user id");
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");
    const settings = safeParseSettings(user.userSettings);
    const next = mutator({ ...settings }) || {};
    await tx.users.update({
      where: { id },
      data: { userSettings: JSON.stringify(next) },
    });
    return next;
  });
}

async function listAssignedThreads(userId) {
  const user = await prisma.users.findUnique({ where: { id: parseInt(userId) } });
  if (!user) return [];
  const settings = safeParseSettings(user.userSettings);
  const list = normalizeAssigned(settings.assignedThreads);
  if (list.length === 0) return [];

  const workspaceSlugs = [...new Set(list.map((e) => e.workspaceSlug))];
  const workspaces = await prisma.workspaces.findMany({
    where: { slug: { in: workspaceSlugs } },
    select: { id: true, slug: true, name: true },
  });
  const wsBySlug = Object.fromEntries(workspaces.map((w) => [w.slug, w]));

  const threads = await prisma.workspace_threads.findMany({
    where: {
      OR: list
        .map((e) => {
          const ws = wsBySlug[e.workspaceSlug];
          return ws ? { workspace_id: ws.id, slug: e.threadSlug } : null;
        })
        .filter(Boolean),
    },
    select: { id: true, slug: true, name: true, workspace_id: true },
  });
  const threadByKey = Object.fromEntries(
    threads.map((t) => {
      const ws = workspaces.find((w) => w.id === t.workspace_id);
      return [`${ws?.slug}::${t.slug}`, t];
    })
  );

  return list
    .map((e) => {
      const ws = wsBySlug[e.workspaceSlug];
      const thread = threadByKey[`${e.workspaceSlug}::${e.threadSlug}`];
      if (!ws || !thread) return null;
      return {
        workspaceSlug: e.workspaceSlug,
        workspaceName: ws.name,
        threadSlug: e.threadSlug,
        threadName: thread.name,
      };
    })
    .filter(Boolean);
}

async function addAssignment(userId, workspaceSlug, threadSlug) {
  const ws = await prisma.workspaces.findUnique({
    where: { slug: String(workspaceSlug) },
    select: { id: true },
  });
  if (!ws) throw new Error("Workspace not found");
  const thread = await prisma.workspace_threads.findFirst({
    where: { workspace_id: ws.id, slug: String(threadSlug) },
    select: { id: true },
  });
  if (!thread) throw new Error("Thread not found");

  return mutateUserSettings(userId, (settings) => {
    const list = normalizeAssigned(settings.assignedThreads);
    list.push({ workspaceSlug, threadSlug });
    settings.assignedThreads = normalizeAssigned(list);
    return settings;
  });
}

async function removeAssignment(userId, workspaceSlug, threadSlug) {
  return mutateUserSettings(userId, (settings) => {
    const list = normalizeAssigned(settings.assignedThreads).filter(
      (e) =>
        !(e.workspaceSlug === workspaceSlug && e.threadSlug === threadSlug)
    );
    settings.assignedThreads = list;
    return settings;
  });
}

module.exports = {
  mutateUserSettings,
  listAssignedThreads,
  addAssignment,
  removeAssignment,
  normalizeAssigned,
  safeParseSettings,
};
