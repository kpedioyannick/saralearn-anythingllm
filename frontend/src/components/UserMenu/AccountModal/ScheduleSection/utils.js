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

const toMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

// Returns a Set of slot ids that overlap another slot on the same day.
export function detectOverlaps(slots) {
  const conflicts = new Set();
  const byDay = new Map();
  for (const s of slots) {
    if (!s?.dayOfWeek) continue;
    if (!byDay.has(s.dayOfWeek)) byDay.set(s.dayOfWeek, []);
    byDay.get(s.dayOfWeek).push(s);
  }
  for (const [, daySlots] of byDay) {
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        const a = daySlots[i];
        const b = daySlots[j];
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
  return conflicts;
}

export function sortByStart(slots) {
  return [...slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export function groupByDay(slots) {
  const out = {};
  for (const d of DAYS) out[d.key] = [];
  for (const s of slots) {
    if (s?.dayOfWeek && out[s.dayOfWeek]) out[s.dayOfWeek].push(s);
  }
  for (const key of Object.keys(out)) out[key] = sortByStart(out[key]);
  return out;
}
