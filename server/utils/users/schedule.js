const { randomUUID } = require("crypto");
const prisma = require("../prisma");
const { mutateUserSettings, safeParseSettings } = require("./assignedThreads");

const TYPES = ["school", "revision"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const RECURRENCES = ["weekly", "daily", "once"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asString(v, max = 200) {
  if (v == null) return "";
  return String(v).slice(0, max);
}

function validateAndNormalize(slot, { allowPartial = false } = {}) {
  if (!slot || typeof slot !== "object") throw new Error("Invalid slot payload");
  const out = {};

  if (!allowPartial || slot.type !== undefined) {
    if (!TYPES.includes(slot.type))
      throw new Error(`type must be one of ${TYPES.join(", ")}`);
    out.type = slot.type;
  }

  if (!allowPartial || slot.dayOfWeek !== undefined) {
    if (!DAYS.includes(slot.dayOfWeek))
      throw new Error(`dayOfWeek must be one of ${DAYS.join(", ")}`);
    out.dayOfWeek = slot.dayOfWeek;
  }

  if (!allowPartial || slot.start !== undefined) {
    if (!TIME_RE.test(String(slot.start || "")))
      throw new Error("start must be HH:MM (24h)");
    out.start = slot.start;
  }

  if (!allowPartial || slot.end !== undefined) {
    if (!TIME_RE.test(String(slot.end || "")))
      throw new Error("end must be HH:MM (24h)");
    out.end = slot.end;
  }

  if (out.start && out.end && out.start >= out.end)
    throw new Error("end must be after start");

  if (!allowPartial || slot.recurrence !== undefined) {
    if (!RECURRENCES.includes(slot.recurrence))
      throw new Error(`recurrence must be one of ${RECURRENCES.join(", ")}`);
    out.recurrence = slot.recurrence;
  }

  if (out.recurrence === "once" || (allowPartial && slot.date !== undefined)) {
    if (slot.date && !DATE_RE.test(String(slot.date)))
      throw new Error("date must be YYYY-MM-DD");
    out.date = slot.date || null;
    if (out.recurrence === "once" && !out.date)
      throw new Error("date is required when recurrence is 'once'");
  } else if (!allowPartial) {
    out.date = null;
  }

  if (slot.title !== undefined) out.title = asString(slot.title, 120);
  if (slot.subject !== undefined) out.subject = asString(slot.subject, 60);
  if (slot.note !== undefined) out.note = asString(slot.note, 500);
  if (slot.teacher !== undefined) out.teacher = asString(slot.teacher, 80);
  if (slot.room !== undefined) out.room = asString(slot.room, 60);
  if (slot.workspaceSlug !== undefined)
    out.workspaceSlug = asString(slot.workspaceSlug, 120) || null;
  if (slot.threadSlug !== undefined)
    out.threadSlug = asString(slot.threadSlug, 120) || null;
  if (slot.threadLabel !== undefined)
    out.threadLabel = asString(slot.threadLabel, 120);
  if (slot.color !== undefined) out.color = asString(slot.color, 16) || null;

  return out;
}

function listSlots(user) {
  const settings = safeParseSettings(user?.userSettings);
  const slots = settings?.schedule?.slots;
  return Array.isArray(slots) ? slots : [];
}

async function getSchedule(userId) {
  const user = await prisma.users.findUnique({
    where: { id: parseInt(userId) },
  });
  if (!user) return [];
  return listSlots(user);
}

async function addSlot(userId, payload) {
  const validated = validateAndNormalize(payload, { allowPartial: false });
  const slot = {
    id: randomUUID(),
    title: "",
    subject: "",
    note: "",
    teacher: "",
    room: "",
    workspaceSlug: null,
    threadSlug: null,
    threadLabel: "",
    color: null,
    ...validated,
    createdAt: new Date().toISOString(),
  };
  await mutateUserSettings(userId, (settings) => {
    const schedule =
      settings.schedule && typeof settings.schedule === "object"
        ? settings.schedule
        : {};
    const slots = Array.isArray(schedule.slots) ? schedule.slots : [];
    slots.push(slot);
    schedule.slots = slots;
    settings.schedule = schedule;
    return settings;
  });
  return slot;
}

async function updateSlot(userId, slotId, payload) {
  const patch = validateAndNormalize(payload, { allowPartial: true });
  let updated = null;
  await mutateUserSettings(userId, (settings) => {
    const slots = settings?.schedule?.slots;
    if (!Array.isArray(slots)) throw new Error("Slot not found");
    const idx = slots.findIndex((s) => s && s.id === slotId);
    if (idx === -1) throw new Error("Slot not found");
    const merged = { ...slots[idx], ...patch };
    if (merged.start && merged.end && merged.start >= merged.end)
      throw new Error("end must be after start");
    if (merged.recurrence === "once" && !merged.date)
      throw new Error("date is required when recurrence is 'once'");
    slots[idx] = merged;
    updated = merged;
    settings.schedule.slots = slots;
    return settings;
  });
  return updated;
}

async function deleteSlot(userId, slotId) {
  let removed = false;
  await mutateUserSettings(userId, (settings) => {
    const slots = settings?.schedule?.slots;
    if (!Array.isArray(slots)) return settings;
    const next = slots.filter((s) => s && s.id !== slotId);
    removed = next.length !== slots.length;
    settings.schedule = { ...settings.schedule, slots: next };
    return settings;
  });
  return removed;
}

module.exports = {
  TYPES,
  DAYS,
  RECURRENCES,
  validateAndNormalize,
  listSlots,
  getSchedule,
  addSlot,
  updateSlot,
  deleteSlot,
};
