import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { CalendarBlank, X } from "@phosphor-icons/react";
import ScheduleSection from "../UserMenu/AccountModal/ScheduleSection";

export const PLANNING_SHEET_OPEN_EVENT = "sara:openPlanningSheet";

const SHEET_ANIM_MS = 280;

/**
 * Right-sheet dédié au planning. Singleton monté dans UserMenu (cf. UserButton).
 * Ouvert via event global `sara:openPlanningSheet` (depuis le bouton chatinput
 * ou l'item menu UserButton).
 */
export default function PlanningSheet() {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(PLANNING_SHEET_OPEN_EVENT, onOpen);
    return () =>
      window.removeEventListener(PLANNING_SHEET_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setClosing(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => setOpen(false), SHEET_ANIM_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!open) return null;

  const visible = entered && !closing;

  const sheet = (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="planning-sheet-title"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-[3px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 z-10 flex h-full w-[98%] md:w-[92%] lg:w-[86%] xl:w-[78%] max-w-[1320px] flex-col overflow-hidden border-l border-theme-modal-border/80 bg-theme-bg-secondary shadow-2xl shadow-black/50 transform transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 px-6 py-4 border-b border-theme-modal-border/80 flex items-center gap-3 bg-gradient-to-r from-blue-500/15 via-transparent to-emerald-500/15">
          <div className="p-2 rounded-xl bg-blue-500/15 light:bg-blue-100 border border-blue-400/20 light:border-blue-300">
            <CalendarBlank
              size={20}
              weight="duotone"
              className="text-blue-300 light:text-blue-700"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="planning-sheet-title"
              className="text-lg font-semibold text-white light:text-slate-800"
            >
              Mon planning
            </h3>
            <p className="text-xs text-white/60 light:text-slate-500 m-0">
              Cours et révisions de la semaine
            </p>
          </div>
          <button
            onClick={requestClose}
            type="button"
            aria-label="Fermer"
            className="p-1.5 rounded-lg bg-transparent hover:bg-theme-modal-border text-white light:text-slate-700 light:hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5 bg-gradient-to-b from-theme-bg-secondary to-theme-bg-primary/70">
          <ScheduleSection onNavigate={requestClose} hideTitle />
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheet, document.body);
}
