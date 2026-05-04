const { listSlots } = require("./schedule");

const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const DAY_LABEL_FR = {
  mon: "lundi",
  tue: "mardi",
  wed: "mercredi",
  thu: "jeudi",
  fri: "vendredi",
  sat: "samedi",
  sun: "dimanche",
};

function paris(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const dayKey = (parts.weekday || "")
    .toLowerCase()
    .replace("mon", "mon")
    .replace("tue", "tue")
    .replace("wed", "wed")
    .replace("thu", "thu")
    .replace("fri", "fri")
    .replace("sat", "sat")
    .replace("sun", "sun");
  const isoDate = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { isoDate, time, dayKey };
}

function slotApplies(slot, { isoDate, dayKey }) {
  if (!slot || !slot.dayOfWeek || !slot.start || !slot.end) return false;
  if (slot.recurrence === "once") return slot.date === isoDate;
  if (slot.recurrence === "daily") return true;
  // weekly (default)
  return slot.dayOfWeek === dayKey;
}

function describeSlot(slot) {
  const parts = [];
  parts.push(slot.title || (slot.type === "school" ? "Cours" : "Révision"));
  parts.push(`(${slot.start}–${slot.end})`);
  if (slot.subject) parts.push(`matière: ${slot.subject}`);
  if (slot.type === "school") {
    if (slot.teacher) parts.push(`prof: ${slot.teacher}`);
    if (slot.room) parts.push(`salle: ${slot.room}`);
  } else {
    if (slot.workspaceSlug) parts.push(`workspace: ${slot.workspaceSlug}`);
    if (slot.threadSlug) parts.push(`thread: ${slot.threadSlug}`);
    else if (slot.threadLabel) parts.push(`thread (libellé libre): ${slot.threadLabel}`);
  }
  if (slot.note) parts.push(`note: ${slot.note}`);
  return parts.join(" ");
}

/**
 * Build a short system-prompt block describing the student's current schedule
 * context. Returns null when no slots apply (so caller can skip injection).
 */
function buildScheduleContextBlock(user, now = new Date()) {
  if (!user) return null;
  const slots = listSlots(user);
  if (slots.length === 0) return null;
  const today = paris(now);
  const todays = slots
    .filter((s) => slotApplies(s, today))
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

  if (todays.length === 0) return null;

  const t = today.time;
  const current = todays.find((s) => s.start <= t && t < s.end);
  const upcoming = todays.find((s) => s.start > t);
  const earlier = todays.filter((s) => s.end <= t);

  const lines = [
    `[CONTEXTE PLANNING ÉLÈVE — ${DAY_LABEL_FR[today.dayKey] || today.dayKey} ${today.isoDate}, il est ${t} (Europe/Paris)]`,
  ];
  if (current) {
    lines.push(`Créneau EN COURS — type ${current.type}: ${describeSlot(current)}`);
    if (current.type === "revision" && (current.workspaceSlug || current.threadSlug)) {
      lines.push(
        "→ Focalise tes réponses sur ce sujet de révision. Si l'élève s'écarte, propose-lui de revenir au planning."
      );
    } else if (current.type === "school") {
      lines.push(
        "→ L'élève est probablement en classe. Réponds de façon concise et discrète, ne lance pas d'exercice long sans demande explicite."
      );
    }
  }
  if (upcoming) {
    lines.push(`Prochain créneau — type ${upcoming.type}: ${describeSlot(upcoming)}`);
  }
  if (earlier.length > 0) {
    const summary = earlier.map((s) => `${s.title || s.subject || s.type} (${s.start}–${s.end})`).join(", ");
    lines.push(`Plus tôt aujourd'hui: ${summary}`);
  }
  return lines.join("\n");
}

module.exports = { buildScheduleContextBlock };
