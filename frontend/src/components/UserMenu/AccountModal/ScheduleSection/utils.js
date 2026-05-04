export const DAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

export const RECURRENCES = [
  { value: "weekly", label: "Chaque semaine" },
  { value: "daily", label: "Tous les jours" },
  { value: "once", label: "Une seule fois" },
];

// JS Date.getDay() ordering (0 = Sunday) → our slot.dayOfWeek keys.
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const toMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

export function isoDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayKeyOf(date) {
  return DAY_KEYS[new Date(date).getDay()];
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addWeeks(date, n) {
  return addDays(date, n * 7);
}

export function getMondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  const fmt = (d, opts) => d.toLocaleDateString("fr-FR", opts);
  if (sameMonth && sameYear) {
    return `${monday.getDate()} → ${fmt(sunday, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }
  if (sameYear) {
    return `${fmt(monday, { day: "numeric", month: "short" })} → ${fmt(sunday, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  return `${fmt(monday, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} → ${fmt(sunday, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export function slotApplies(slot, dateOfDay) {
  if (!slot || !slot.dayOfWeek) return false;
  if (slot.recurrence === "once") return slot.date === isoDate(dateOfDay);
  if (slot.recurrence === "daily") return true;
  return slot.dayOfWeek === dayKeyOf(dateOfDay);
}

export function sortByStart(slots) {
  return [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export function groupByDay(slots, weekStart) {
  const out = {};
  if (!weekStart) {
    for (const d of DAYS) out[d.key] = [];
    for (const s of slots) {
      if (s?.dayOfWeek && out[s.dayOfWeek]) out[s.dayOfWeek].push(s);
    }
    for (const key of Object.keys(out)) out[key] = sortByStart(out[key]);
    return out;
  }
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const key = DAYS[i].key;
    const list = [];
    for (const s of slots) if (slotApplies(s, d)) list.push(s);
    out[key] = sortByStart(list);
  }
  return out;
}

function findOverlapsIn(list, conflicts) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const aStart = toMinutes(a.start);
      const aEnd = toMinutes(a.end);
      const bStart = toMinutes(b.start);
      const bEnd = toMinutes(b.end);
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
}

// Accepts either the raw slots array (legacy: groups by dayOfWeek field) or a
// byDay map produced by `groupByDay`.
export function detectOverlaps(slotsOrByDay) {
  const conflicts = new Set();
  if (Array.isArray(slotsOrByDay)) {
    const byDay = new Map();
    for (const s of slotsOrByDay) {
      if (!s?.dayOfWeek) continue;
      if (!byDay.has(s.dayOfWeek)) byDay.set(s.dayOfWeek, []);
      byDay.get(s.dayOfWeek).push(s);
    }
    for (const [, list] of byDay) findOverlapsIn(list, conflicts);
  } else {
    for (const key of Object.keys(slotsOrByDay)) {
      findOverlapsIn(slotsOrByDay[key], conflicts);
    }
  }
  return conflicts;
}
