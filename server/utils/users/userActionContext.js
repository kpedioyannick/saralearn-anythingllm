const prisma = require("../prisma");
const { listSlots } = require("./schedule");
const { safeParseSettings, normalizeAssigned } = require("./assignedThreads");

const TZ = "Europe/Paris";
const DAY_LABEL_FR = {
  mon: "lundi",
  tue: "mardi",
  wed: "mercredi",
  thu: "jeudi",
  fri: "vendredi",
  sat: "samedi",
  sun: "dimanche",
};

function dayInfo(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    dayKey: (parts.weekday || "").toLowerCase().slice(0, 3),
    time: `${parts.hour}:${parts.minute}`,
  };
}

function resolveDates(scope, now = new Date()) {
  if (scope === "tomorrow") {
    const t = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return [dayInfo(t)];
  }
  if (scope === "week") {
    return Array.from({ length: 7 }, (_, i) =>
      dayInfo(new Date(now.getTime() + i * 24 * 60 * 60 * 1000))
    );
  }
  return [dayInfo(now)];
}

function slotApplies(slot, { isoDate, dayKey }) {
  if (!slot || !slot.dayOfWeek || !slot.start || !slot.end) return false;
  if (slot.recurrence === "once") return slot.date === isoDate;
  if (slot.recurrence === "daily") return true;
  return slot.dayOfWeek === dayKey;
}

function describeSlot(slot, dayInfo) {
  const parts = [];
  if (dayInfo) parts.push(DAY_LABEL_FR[dayInfo.dayKey] || dayInfo.dayKey);
  parts.push(`${slot.start}–${slot.end}`);
  parts.push(`type ${slot.type}`);
  parts.push(slot.title || (slot.type === "school" ? "Cours" : "Révision"));
  if (slot.subject) parts.push(`matière: ${slot.subject}`);
  if (slot.type === "school") {
    if (slot.teacher) parts.push(`prof: ${slot.teacher}`);
    if (slot.room) parts.push(`salle: ${slot.room}`);
  } else {
    if (slot.workspaceSlug) parts.push(`workspace: ${slot.workspaceSlug}`);
    if (slot.threadSlug) parts.push(`thread: ${slot.threadSlug}`);
  }
  if (slot.note) parts.push(`note: ${slot.note}`);
  return parts.join(" · ");
}

async function fetchAssignedDetails(user) {
  const settings = safeParseSettings(user?.userSettings);
  const list = normalizeAssigned(settings.assignedThreads);
  if (list.length === 0) return [];

  const wsSlugs = [...new Set(list.map((e) => e.workspaceSlug))];
  const workspaces = await prisma.workspaces.findMany({
    where: { slug: { in: wsSlugs } },
    select: { id: true, slug: true, name: true },
  });
  const wsById = Object.fromEntries(workspaces.map((w) => [w.id, w]));
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

  return threads.map((t) => ({
    threadId: t.id,
    threadSlug: t.slug,
    threadName: t.name,
    workspaceSlug: wsById[t.workspace_id]?.slug || "",
    workspaceName: wsById[t.workspace_id]?.name || "",
  }));
}

async function fetchObjectivesProgress(userId, threadIds) {
  if (!threadIds || threadIds.length === 0) return new Map();

  const objectives = await prisma.thread_objectives.findMany({
    where: { threadId: { in: threadIds } },
    select: {
      id: true,
      threadId: true,
      title: true,
      orderIndex: true,
    },
    orderBy: [{ threadId: "asc" }, { orderIndex: "asc" }],
  });
  if (objectives.length === 0) return new Map();

  // Mastered = au moins 1 user_exercise correct sur cet objectif.
  // (Critère MVP simple, à raffiner phase 2 vers "3/3 derniers".)
  const ex = await prisma.user_exercises.findMany({
    where: {
      userId: parseInt(userId),
      threadObjectiveId: { in: objectives.map((o) => o.id) },
      isCorrect: true,
    },
    select: { threadObjectiveId: true },
  });
  const masteredIds = new Set(ex.map((e) => e.threadObjectiveId));

  const byThread = new Map();
  for (const obj of objectives) {
    if (!byThread.has(obj.threadId)) byThread.set(obj.threadId, []);
    byThread.get(obj.threadId).push({
      ...obj,
      mastered: masteredIds.has(obj.id),
    });
  }
  return byThread;
}

/**
 * Builds the [CONTEXTE ACTION ÉLÈVE] block injected in system prompt for
 * intents `planning` and `quoi_faire`.
 *
 * @param {object} user — full user row (with userSettings JSON string)
 * @param {string} scope — "today" | "tomorrow" | "week"
 * @param {Date} now
 * @returns {Promise<string|null>}
 */
async function buildUserActionContext(user, scope = "today", now = new Date()) {
  if (!user?.id) return null;
  const dates = resolveDates(scope, now);
  const todayInfo = dayInfo(now);
  const slots = listSlots(user);

  // Filter slots applicable on the requested dates, tagged with their date.
  const taggedSlots = dates.flatMap((d) =>
    slots
      .filter((s) => slotApplies(s, d))
      .map((s) => ({ slot: s, day: d }))
  );
  taggedSlots.sort((a, b) => {
    if (a.day.isoDate !== b.day.isoDate)
      return a.day.isoDate.localeCompare(b.day.isoDate);
    return (a.slot.start || "").localeCompare(b.slot.start || "");
  });

  const assigned = await fetchAssignedDetails(user);
  const objectivesByThread = await fetchObjectivesProgress(
    user.id,
    assigned.map((a) => a.threadId)
  );

  const lines = [];
  const scopeLabel =
    scope === "tomorrow"
      ? "demain"
      : scope === "week"
        ? "cette semaine"
        : "aujourd'hui";
  lines.push(
    `[CONTEXTE ACTION ÉLÈVE — scope: ${scope} — ${scopeLabel} (référence: ${todayInfo.isoDate} ${todayInfo.time}, Europe/Paris)]`
  );

  // Current slot (only meaningful for "today")
  if (scope === "today") {
    const todays = slots.filter((s) => slotApplies(s, todayInfo));
    const current = todays.find(
      (s) => s.start <= todayInfo.time && todayInfo.time < s.end
    );
    if (current) {
      lines.push("");
      lines.push(`Créneau EN COURS — ${describeSlot(current, todayInfo)}`);
    }
  }

  // Slots du scope
  lines.push("");
  if (taggedSlots.length === 0) {
    lines.push(`Créneaux ${scopeLabel} : aucun.`);
  } else {
    lines.push(`Créneaux ${scopeLabel} :`);
    for (const { slot, day } of taggedSlots) {
      lines.push(`- ${describeSlot(slot, day)}`);
    }
  }

  // Threads assignés
  lines.push("");
  if (assigned.length === 0) {
    lines.push("Threads assignés : aucun.");
  } else {
    lines.push("Threads assignés (en attente) :");
    for (const a of assigned) {
      const objs = objectivesByThread.get(a.threadId) || [];
      const total = objs.length;
      const mastered = objs.filter((o) => o.mastered).length;
      const summary = total > 0 ? ` — ${total} objectifs (${mastered} maîtrisés)` : "";
      lines.push(
        `- ${a.workspaceSlug} / ${a.threadSlug} — "${a.threadName}"${summary}`
      );
    }
  }

  // Objectifs non maîtrisés (top 10 max)
  const pending = [];
  for (const a of assigned) {
    const objs = objectivesByThread.get(a.threadId) || [];
    for (const o of objs) {
      if (!o.mastered) pending.push({ threadName: a.threadName, title: o.title });
    }
  }
  if (pending.length > 0) {
    lines.push("");
    lines.push("Objectifs non encore maîtrisés (priorisés) :");
    for (const p of pending.slice(0, 10)) {
      lines.push(`- [${p.threadName}] ${p.title}`);
    }
    if (pending.length > 10) {
      lines.push(`... (+${pending.length - 10} autres)`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  buildUserActionContext,
  resolveDates,
  slotApplies,
  describeSlot,
};
