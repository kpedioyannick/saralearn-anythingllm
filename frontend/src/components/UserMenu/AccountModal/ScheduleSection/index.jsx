import { useMemo, useRef, useEffect, useState } from "react";
import { Calendar, Plus, Warning } from "@phosphor-icons/react";
import useUserSchedule from "@/hooks/useUserSchedule";
import showToast from "@/utils/toast";
import SlotForm from "./SlotForm";
import { DAYS, detectOverlaps, groupByDay } from "./utils";

const TYPE_STYLES = {
  school: "bg-blue-500/20 border-blue-400 text-blue-50",
  revision: "bg-emerald-500/20 border-emerald-400 text-emerald-50",
};

export default function ScheduleSection() {
  const { slots, loading, addSlot, updateSlot, removeSlot } = useUserSchedule();
  const [editing, setEditing] = useState(null); // null | "new" | slot object
  const conflicts = useMemo(() => detectOverlaps(slots), [slots]);
  const byDay = useMemo(() => groupByDay(slots), [slots]);
  const formRef = useRef(null);

  useEffect(() => {
    if (editing && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editing]);

  const handleSave = async (payload) => {
    if (editing === "new") {
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
    setEditing(null);
  };

  return (
    <div className="mt-2 pt-6 border-t border-theme-modal-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-x-2">
          <Calendar size={18} className="text-white" />
          <h4 className="text-sm font-semibold text-white">
            Mon planning (cours + révisions)
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-x-1 bg-white text-black hover:opacity-60 px-3 py-1.5 rounded-lg text-xs font-semibold"
        >
          <Plus size={14} weight="bold" /> Ajouter un créneau
        </button>
      </div>

      {editing && (
        <div ref={formRef}>
          <SlotForm
            slot={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onDelete={editing !== "new" ? () => handleDelete(editing.id) : null}
          />
        </div>
      )}

      <div className="flex items-center gap-x-4 mb-3 text-xs text-white/70">
        <span className="flex items-center gap-x-1">
          <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-400" />
          Cours
        </span>
        <span className="flex items-center gap-x-1">
          <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400" />
          Révision
        </span>
        <span className="flex items-center gap-x-1 text-red-300">
          <Warning size={14} /> Chevauchement
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-white/50 italic">Chargement…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-white/50 italic">
          Aucun créneau. Clique sur « Ajouter un créneau » pour commencer.
        </p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div
              key={d.key}
              className="flex flex-col bg-theme-bg-primary rounded-md p-1 min-h-[110px]"
            >
              <div className="text-xs font-semibold text-white/80 text-center pb-1 border-b border-white/10 mb-1">
                {d.label}
              </div>
              <div className="flex flex-col gap-y-1">
                {byDay[d.key].length === 0 && (
                  <span className="text-[10px] text-white/30 text-center mt-1">
                    —
                  </span>
                )}
                {byDay[d.key].map((s) => {
                  const inConflict = conflicts.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditing(s)}
                      className={`text-left text-[10px] leading-tight rounded border px-1.5 py-1 hover:opacity-80 ${
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
                            size={10}
                            weight="fill"
                            className="text-red-300 shrink-0"
                          />
                        )}
                        <span className="truncate">
                          {s.title || (s.type === "school" ? "Cours" : "Révision")}
                        </span>
                      </div>
                      <div className="opacity-80">
                        {s.start}–{s.end}
                      </div>
                      {s.subject && (
                        <div className="opacity-70 truncate">{s.subject}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
