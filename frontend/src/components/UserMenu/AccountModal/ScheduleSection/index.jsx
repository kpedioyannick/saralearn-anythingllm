import { useMemo, useRef, useEffect, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  Calendar,
  Plus,
  PencilSimple,
  Warning,
} from "@phosphor-icons/react";
import useUserSchedule from "@/hooks/useUserSchedule";
import showToast from "@/utils/toast";
import SlotForm from "./SlotForm";
import {
  DAYS,
  addDays,
  addWeeks,
  dayKeyOf,
  detectOverlaps,
  formatWeekRange,
  getMondayOf,
  groupByDay,
  isSameDay,
} from "./utils";

const TYPE_STYLES = {
  school:
    "bg-blue-500/20 border-blue-400 text-blue-50 light:bg-blue-100 light:border-blue-500 light:text-blue-900",
  revision:
    "bg-emerald-500/20 border-emerald-400 text-emerald-50 light:bg-emerald-100 light:border-emerald-500 light:text-emerald-900",
};

const toMinutes = (hhmm = "00:00") => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const durationMinutes = (slot) =>
  Math.max(0, toMinutes(slot?.end) - toMinutes(slot?.start));

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m} min`;
};

export default function ScheduleSection({ onNavigate, hideTitle = false }) {
  const { slots, loading, addSlot, updateSlot, removeSlot } = useUserSchedule();
  const [editing, setEditing] = useState(null); // null | "new" | slot object
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const todayMonday = useMemo(() => getMondayOf(new Date()), []);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const isCurrentWeek = isSameDay(weekStart, todayMonday);
  const byDay = useMemo(() => groupByDay(slots, weekStart), [slots, weekStart]);
  const conflicts = useMemo(() => detectOverlaps(byDay), [byDay]);
  const todayByDay = useMemo(
    () => groupByDay(slots, todayMonday),
    [slots, todayMonday]
  );
  const todaySlots = useMemo(() => {
    const key = dayKeyOf(today);
    return todayByDay[key] || [];
  }, [todayByDay, today]);
  const plannedMinutesWeek = useMemo(
    () =>
      Object.values(byDay).reduce(
        (acc, daySlots) =>
          acc +
          daySlots.reduce((dayAcc, s) => dayAcc + durationMinutes(s), 0),
        0
      ),
    [byDay]
  );
  const currentSlot = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return (
      todaySlots.find(
        (s) => toMinutes(s.start) <= nowMins && nowMins < toMinutes(s.end)
      ) || null
    );
  }, [todaySlots]);
  const nextSlot = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return todaySlots.find((s) => toMinutes(s.start) > nowMins) || null;
  }, [todaySlots]);
  const totalSlots = slots.length;
  const conflictCount = conflicts.size;
  const formRef = useRef(null);

  useEffect(() => {
    if (editing && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing]);

  const handleSave = async (payload) => {
    if (editing === "new" || !editing?.id) {
      const res = await addSlot(payload);
      if (!res?.success) {
        showToast(res?.error || "Erreur ajout créneau", "error", { clear: true });
        return false;
      }
      showToast("Créneau ajouté", "success", { clear: true });
    } else if (editing?.id) {
      const res = await updateSlot(editing.id, payload);
      if (!res?.success) {
        showToast(res?.error || "Erreur mise à jour", "error", { clear: true });
        return false;
      }
      showToast("Créneau mis à jour", "success", { clear: true });
    }
    setSelectedSlot(null);
    setEditing(null);
    return true;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce créneau ?")) return;
    const res = await removeSlot(id);
    if (!res?.success) {
      showToast("Erreur suppression", "error", { clear: true });
      return;
    }
    setSelectedSlot(null);
    setEditing(null);
  };

  const dayLabel = (key) => DAYS.find((d) => d.key === key)?.label || key;
  const recurrenceLabel = (value) => {
    if (value === "daily") return "Tous les jours";
    if (value === "once") return "Une seule fois";
    return "Chaque semaine";
  };

  return (
    <div className={hideTitle ? "" : "mt-2 pt-6 border-t border-theme-modal-border"}>
      <div className="rounded-3xl border border-theme-modal-border/70 bg-theme-bg-primary/70 light:bg-white/90 p-4 md:p-5 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-4">
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-white/50 light:text-slate-500 m-0">
            Maintenant
          </p>
          <p className="text-sm font-semibold text-white light:text-slate-800 mt-1 mb-0">
            {currentSlot
              ? `${currentSlot.title || currentSlot.subject || "Créneau"} · ${currentSlot.start}-${currentSlot.end}`
              : "Aucun créneau en cours"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-white/50 light:text-slate-500 m-0">
            Prochain
          </p>
          <p className="text-sm font-semibold text-white light:text-slate-800 mt-1 mb-0">
            {nextSlot
              ? `${nextSlot.title || nextSlot.subject || "Créneau"} · ${nextSlot.start}-${nextSlot.end}`
              : "Rien de prévu ensuite aujourd'hui"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-white/50 light:text-slate-500 m-0">
            Charge semaine
          </p>
          <p className="text-sm font-semibold text-white light:text-slate-800 mt-1 mb-0">
            {formatDuration(plannedMinutesWeek)} planifiées
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() =>
            setEditing({
              type: "revision",
              dayOfWeek: dayKeyOf(today),
              start: "18:00",
              end: "19:00",
              recurrence: "weekly",
            })
          }
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-400/30 text-emerald-100 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-700"
        >
          + Révision ce soir
        </button>
        <button
          type="button"
          onClick={() =>
            setEditing({
              type: "school",
              dayOfWeek: dayKeyOf(addDays(today, 1)),
              start: "08:00",
              end: "09:00",
              recurrence: "once",
              date: addDays(today, 1).toISOString().slice(0, 10),
            })
          }
          className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-400/30 text-blue-100 light:bg-blue-50 light:border-blue-200 light:text-blue-700"
        >
          + Cours demain matin
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {hideTitle ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 light:bg-slate-100 border border-white/10 light:border-slate-200 text-xs font-semibold text-white/85 light:text-slate-700">
              <Calendar size={14} /> Planning semaine
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-[11px] font-semibold text-blue-100 light:bg-blue-50 light:text-blue-700 light:border-blue-200">
              {totalSlots} créneaux
            </span>
            {conflictCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-400/30 text-[11px] font-semibold text-red-200 light:bg-red-50 light:text-red-700 light:border-red-200">
                <Warning size={12} weight="fill" />
                {conflictCount} conflit{conflictCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            <Calendar size={18} className="text-white light:text-slate-700" />
            <h4 className="text-sm font-semibold text-white light:text-slate-800">
              Mon planning (cours + révisions)
            </h4>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setSelectedSlot(null);
            setEditing("new");
          }}
          className="flex items-center gap-x-1 bg-white text-black hover:opacity-80 light:bg-blue-600 light:text-white light:hover:bg-blue-700 light:hover:opacity-100 px-3.5 py-2 rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 shadow-sm"
        >
          <Plus size={14} weight="bold" /> Ajouter un créneau
        </button>
      </div>

      {selectedSlot && !editing && (
        <div className="mb-4 rounded-2xl border border-white/10 light:border-slate-200 bg-white/5 light:bg-slate-50/90 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="m-0 text-[11px] uppercase tracking-wide text-white/50 light:text-slate-500">
                Aperçu du créneau
              </p>
              <h4 className="m-0 mt-1 text-base font-semibold text-white light:text-slate-800 break-words">
                {selectedSlot.title ||
                  selectedSlot.subject ||
                  (selectedSlot.type === "school" ? "Cours" : "Révision")}
              </h4>
            </div>
            <span
              className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold border ${
                selectedSlot.type === "school"
                  ? "bg-blue-500/20 border-blue-400/40 text-blue-100 light:bg-blue-100 light:border-blue-300 light:text-blue-700"
                  : "bg-emerald-500/20 border-emerald-400/40 text-emerald-100 light:bg-emerald-100 light:border-emerald-300 light:text-emerald-700"
              }`}
            >
              {selectedSlot.type === "school" ? "Cours" : "Révision"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg px-3 py-2 bg-theme-bg-secondary/70 light:bg-white border border-white/10 light:border-slate-200">
              <p className="m-0 text-[11px] text-white/50 light:text-slate-500">Jour</p>
              <p className="m-0 mt-1 text-white light:text-slate-800 font-medium">
                {dayLabel(selectedSlot.dayOfWeek)}
              </p>
            </div>
            <div className="rounded-lg px-3 py-2 bg-theme-bg-secondary/70 light:bg-white border border-white/10 light:border-slate-200">
              <p className="m-0 text-[11px] text-white/50 light:text-slate-500">Horaire</p>
              <p className="m-0 mt-1 text-white light:text-slate-800 font-medium">
                {selectedSlot.start} - {selectedSlot.end}
              </p>
            </div>
            <div className="rounded-lg px-3 py-2 bg-theme-bg-secondary/70 light:bg-white border border-white/10 light:border-slate-200">
              <p className="m-0 text-[11px] text-white/50 light:text-slate-500">Récurrence</p>
              <p className="m-0 mt-1 text-white light:text-slate-800 font-medium">
                {recurrenceLabel(selectedSlot.recurrence)}
              </p>
            </div>
          </div>

          {selectedSlot.note && (
            <div className="mt-2 rounded-lg px-3 py-2 bg-theme-bg-secondary/70 light:bg-white border border-white/10 light:border-slate-200">
              <p className="m-0 text-[11px] text-white/50 light:text-slate-500">Note</p>
              <p className="m-0 mt-1 text-sm text-white/90 light:text-slate-700 break-words">
                {selectedSlot.note}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10 light:text-slate-600 light:hover:bg-slate-100"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(selectedSlot);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 border border-blue-400/40 text-blue-100 light:bg-blue-100 light:border-blue-300 light:text-blue-700"
            >
              <PencilSimple size={12} weight="bold" />
              Modifier
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div ref={formRef}>
          <SlotForm
            slot={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onDelete={editing !== "new" ? () => handleDelete(editing.id) : null}
            onNavigate={onNavigate}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 mb-4 text-xs text-white/80 light:text-slate-600">
        <span className="flex items-center gap-x-1 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 light:bg-blue-50 light:border-blue-200">
          <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-400" />
          Cours
        </span>
        <span className="flex items-center gap-x-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 light:bg-emerald-50 light:border-emerald-200">
          <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400" />
          Révision
        </span>
        <span className="flex items-center gap-x-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-400/30 text-red-300 light:text-red-700 light:bg-red-50 light:border-red-200">
          <Warning size={14} /> Chevauchement
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-white/50 light:text-slate-500 italic">Chargement…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-white/50 light:text-slate-500 italic">
          Aucun créneau. Clique sur « Ajouter un créneau » pour commencer.
        </p>
      ) : (
        <>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-x-2 mb-3 py-2 px-2 rounded-xl bg-theme-bg-secondary/85 light:bg-white/85 backdrop-blur border border-theme-modal-border/60">
            <button
              type="button"
              onClick={() => setWeekStart((d) => addWeeks(d, -1))}
              className="p-2 rounded-lg text-white/80 hover:bg-white/10 light:text-slate-600 light:hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              aria-label="Semaine précédente"
              title="Semaine précédente"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <div className="flex items-center gap-x-2 min-w-0">
              <span className="text-sm font-semibold text-white/90 light:text-slate-800 truncate px-3 py-1.5 rounded-full bg-white/10 light:bg-slate-100 border border-white/10 light:border-slate-200">
                {formatWeekRange(weekStart)}
              </span>
              {!isCurrentWeek && (
                <button
                  type="button"
                  onClick={() => setWeekStart(todayMonday)}
                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 light:bg-emerald-100 light:text-emerald-900 light:hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  title="Revenir à la semaine en cours"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setWeekStart((d) => addWeeks(d, 1))}
              className="p-2 rounded-lg text-white/80 hover:bg-white/10 light:text-slate-600 light:hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              aria-label="Semaine suivante"
              title="Semaine suivante"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        <div className="overflow-x-auto pb-1">
        <div className="grid grid-cols-7 gap-2 min-w-[980px]">
          {DAYS.map((d, i) => {
            const dayDate = addDays(weekStart, i);
            const isToday = isSameDay(dayDate, today);
            return (
            <div
              key={d.key}
              className={`flex flex-col rounded-2xl p-2 min-h-[180px] ${
                isToday
                  ? "bg-emerald-500/10 ring-1 ring-emerald-400/40 light:bg-emerald-50 light:ring-emerald-400"
                  : "bg-theme-bg-primary/80 light:bg-slate-50/80 border border-white/5 light:border-slate-200"
              }`}
            >
              <div
                className={`text-sm font-semibold text-center pb-1.5 border-b mb-2 ${
                  isToday
                    ? "text-emerald-200 border-emerald-400/40 light:text-emerald-900 light:border-emerald-400"
                    : "text-white/80 border-white/10 light:text-slate-700 light:border-slate-300"
                }`}
              >
                {d.label} {dayDate.getDate()}
              </div>
              <div className="flex flex-col gap-y-1.5">
                {byDay[d.key].length === 0 && (
                  <span className="text-xs text-white/30 light:text-slate-400 text-center mt-3">
                    —
                  </span>
                )}
                {byDay[d.key].map((s) => {
                  const inConflict = conflicts.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(s);
                        setEditing(null);
                      }}
                      className={`text-left text-sm leading-tight rounded-xl border px-2 py-2 hover:opacity-95 transition-all shadow-sm ${
                        TYPE_STYLES[s.type] || ""
                      } ${
                        inConflict ? "ring-2 ring-red-400 ring-offset-0" : ""
                      }`}
                      title={
                        inConflict
                          ? "Chevauchement avec un autre créneau"
                          : undefined
                      }
                    >
                      <div className="font-semibold flex items-center gap-x-1">
                        {inConflict && (
                          <Warning
                            size={12}
                            weight="fill"
                            className="text-red-300 shrink-0"
                          />
                        )}
                        <span className="break-words line-clamp-2">
                          {s.title || (s.type === "school" ? "Cours" : "Révision")}
                        </span>
                      </div>
                      <div className="opacity-85 text-xs mt-0.5">
                        {s.start}–{s.end}
                      </div>
                      {s.subject && (
                        <div className="opacity-80 break-words line-clamp-2 text-xs mt-0.5">
                          {s.subject}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
        </div>
        </>
      )}
      </div>

    </div>
  );
}
