import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const COACH_SLUG = "coach-scolaire";
const isCoachWorkspace = (ws) => ws?.slug === COACH_SLUG;

const CHIPS = [
  { id: "exercice", icon: "✏️" },
  { id: "fiche", icon: "📚" },
  { id: "carte_mentale", icon: "🧠" },
  { id: "cours", icon: "🎓" },
  { id: "video", icon: "🎬" },
  { id: "explication", icon: "💡" },
  { id: "exemple", icon: "🔍" },
  {
    id: "dictee",
    icon: "🎤",
    showWhen: (ws) => /fran[cç]ais/i.test(ws?.slug || ""),
  },
  {
    id: "brevet",
    icon: "📝",
    showWhen: (ws) => /brevet/i.test(ws?.slug || ""),
  },
];

const COACH_CHIPS = [
  { id: "coach_today", icon: "📅" },
  { id: "coach_bilan", icon: "📊" },
  { id: "coach_priorites", icon: "🎯" },
  { id: "coach_semaine", icon: "📆" },
  { id: "coach_regularite", icon: "🔥" },
  { id: "coach_examen", icon: "⏰" },
  { id: "coach_motive", icon: "💪" },
  { id: "coach_bloque", icon: "🆘" },
];

function getVisibleChips(workspace) {
  if (isCoachWorkspace(workspace)) return COACH_CHIPS;
  return CHIPS.filter((c) => !c.showWhen || c.showWhen(workspace));
}

// Template ouvert (finit par espace) => on ajoute le titre du thread comme sujet.
// Template complet (dictee, brevet) => pas de concat.
function buildText(template, threadTitle) {
  return template.endsWith(" ") && threadTitle ? template + threadTitle : template;
}

/** Bordure + hover par type de puce (dark / light). */
const INTENT_CHIP_BORDER = {
  exercice:
    "border-amber-500/55 hover:border-amber-400 light:border-amber-500/50 light:hover:border-amber-600",
  fiche:
    "border-sky-500/55 hover:border-sky-400 light:border-sky-500/50 light:hover:border-sky-600",
  carte_mentale:
    "border-violet-500/55 hover:border-violet-400 light:border-violet-500/50 light:hover:border-violet-600",
  cours:
    "border-emerald-500/55 hover:border-emerald-400 light:border-emerald-600/45 light:hover:border-emerald-700",
  video:
    "border-rose-500/55 hover:border-rose-400 light:border-rose-500/50 light:hover:border-rose-600",
  explication:
    "border-yellow-500/55 hover:border-yellow-400 light:border-amber-600/45 light:hover:border-amber-700",
  exemple:
    "border-cyan-500/55 hover:border-cyan-400 light:border-cyan-500/50 light:hover:border-cyan-600",
  dictee:
    "border-fuchsia-500/55 hover:border-fuchsia-400 light:border-fuchsia-500/50 light:hover:border-fuchsia-600",
  brevet:
    "border-orange-500/55 hover:border-orange-400 light:border-orange-500/50 light:hover:border-orange-600",
  coach_today:
    "border-sky-500/55 hover:border-sky-400 light:border-sky-500/50 light:hover:border-sky-600",
  coach_bilan:
    "border-indigo-500/55 hover:border-indigo-400 light:border-indigo-500/50 light:hover:border-indigo-600",
  coach_priorites:
    "border-amber-500/55 hover:border-amber-400 light:border-amber-500/50 light:hover:border-amber-600",
  coach_semaine:
    "border-teal-500/55 hover:border-teal-400 light:border-teal-500/50 light:hover:border-teal-600",
  coach_regularite:
    "border-rose-500/55 hover:border-rose-400 light:border-rose-500/50 light:hover:border-rose-600",
  coach_examen:
    "border-purple-500/55 hover:border-purple-400 light:border-purple-500/50 light:hover:border-purple-600",
  coach_motive:
    "border-emerald-500/55 hover:border-emerald-400 light:border-emerald-600/45 light:hover:border-emerald-700",
  coach_bloque:
    "border-red-500/55 hover:border-red-400 light:border-red-500/50 light:hover:border-red-600",
  coach_demain:
    "border-sky-500/55 hover:border-sky-400 light:border-sky-500/50 light:hover:border-sky-600",
  coach_detail:
    "border-indigo-500/55 hover:border-indigo-400 light:border-indigo-500/50 light:hover:border-indigo-600",
  coach_encore:
    "border-emerald-500/55 hover:border-emerald-400 light:border-emerald-600/45 light:hover:border-emerald-700",
  coach_action:
    "border-amber-500/55 hover:border-amber-400 light:border-amber-500/50 light:hover:border-amber-600",
};

const CHIP_BTN_BASE =
  "text-xs md:text-sm px-3 py-1.5 rounded-full border bg-zinc-800/95 hover:bg-zinc-700 text-zinc-200 hover:text-white light:bg-white light:text-slate-700 light:hover:bg-slate-50 light:hover:text-slate-900 shadow-sm transition-all duration-150 whitespace-nowrap";

const CHIP_BTN_FALLBACK_BORDER =
  "border-zinc-700/60 hover:border-zinc-600 light:border-slate-300 light:hover:border-slate-400";

function ChipButton({ chip, label, onClick }) {
  const borderClass =
    INTENT_CHIP_BORDER[chip.id] ?? CHIP_BTN_FALLBACK_BORDER;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CHIP_BTN_BASE} ${borderClass}`}
    >
      {chip.icon} {label}
    </button>
  );
}

// Centered grid of chips for the empty-thread landing screen.
export default function IntentChips({ workspace, activeThread, sendCommand }) {
  const { t } = useTranslation();
  const visible = getVisibleChips(workspace);
  const threadTitle = activeThread?.name?.trim() || "";

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-[640px] px-4">
      {visible.map((c) => {
        const template = t(`sara.intent_chips.${c.id}.template`);
        const text = buildText(template, threadTitle);
        return (
          <ChipButton
            key={c.id}
            chip={c}
            label={t(`sara.intent_chips.${c.id}.label`)}
            onClick={() => sendCommand({ text, autoSubmit: false })}
          />
        );
      })}
    </div>
  );
}

// Mobile only : compact button next to "Outils", opens a popover with all chips.
// Popover is rendered via React Portal to escape the parent's overflow-hidden.
export function ActivitiesButton({
  workspace,
  activeThread,
  sendCommand,
  textareaRef,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, bottom: 0, maxHeight: 320 });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const computeCoords = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const padding = 12;
      // Popover positioned ABOVE the button (bottom anchor at button top - 8).
      const bottom = window.innerHeight - rect.top + 8;
      // Cap left so the popover does not overflow the right edge.
      const popoverWidth = Math.min(window.innerWidth - 2 * padding, 360);
      const maxLeft = window.innerWidth - popoverWidth - padding;
      const left = Math.max(padding, Math.min(rect.left, maxLeft));
      // Available vertical space above the button, with a safety margin.
      const maxHeight = Math.max(160, rect.top - padding - 8);
      setCoords({ left, bottom, maxHeight });
    };
    computeCoords();

    const onClickOutside = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  const visible = getVisibleChips(workspace);
  const threadTitle = activeThread?.name?.trim() || "";
  if (!visible.length) return null;

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          textareaRef?.current?.focus();
        }}
        aria-haspopup="true"
        aria-expanded={open}
        className={`group border-none cursor-pointer flex items-center justify-center h-6 px-2 rounded-full ${
          open
            ? "bg-zinc-700 light:bg-slate-200"
            : "hover:bg-zinc-700 light:hover:bg-slate-200"
        }`}
      >
        <span
          className={`text-sm font-medium ${
            open
              ? "text-white light:text-slate-800"
              : "text-zinc-300 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-800"
          }`}
        >
          ✨ {t("sara.intent_chips.button_label")}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              left: coords.left,
              bottom: coords.bottom,
              maxHeight: coords.maxHeight,
              width: "min(80vw, 360px)",
            }}
            className="z-[60] bg-zinc-900 light:bg-white border border-zinc-700/50 light:border-slate-200 rounded-xl shadow-xl p-3 overflow-y-auto"
          >
            <div className="flex flex-wrap gap-2">
              {visible.map((c) => {
                const template = t(`sara.intent_chips.${c.id}.template`);
                const text = buildText(template, threadTitle);
                return (
                  <ChipButton
                    key={c.id}
                    chip={c}
                    label={t(`sara.intent_chips.${c.id}.label`)}
                    onClick={() => {
                      sendCommand({ text, autoSubmit: false });
                      setOpen(false);
                      textareaRef?.current?.focus();
                    }}
                  />
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// Follow-up chips rendered under each Sara reply, replacing the old action icons
// (copy, edit, fork, regenerate). Pedagogical : invite the student to keep
// exploring (same content in another format, "encore", "réexplique"...).
const FOLLOWUP_CHIPS = [
  { id: "again", icon: "⟳" },
  { id: "fiche", icon: "📚" },
  { id: "exercice", icon: "✏️" },
  { id: "carte_mentale", icon: "🧠" },
  { id: "explication", icon: "💡" },
];

const COACH_FOLLOWUP_CHIPS = [
  { id: "coach_demain", icon: "📅" },
  { id: "coach_detail", icon: "📊" },
  { id: "coach_encore", icon: "💪" },
  { id: "coach_action", icon: "🎯" },
];

const FOLLOWUP_CHIP_BASE =
  "text-[11px] px-2 py-1 md:px-2.5 rounded-full border bg-zinc-800/95 hover:bg-zinc-700 text-zinc-200 hover:text-white light:bg-white light:text-slate-700 light:hover:bg-slate-50 light:hover:text-slate-900 shadow-sm transition-all duration-150 whitespace-nowrap";

export function FollowUpChips({ sendCommand, slug }) {
  const { t } = useTranslation();
  const chips = slug === COACH_SLUG ? COACH_FOLLOWUP_CHIPS : FOLLOWUP_CHIPS;
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="inline-flex gap-1.5">
        {chips.map((c) => {
          const text = t(`chat_window.followup_chips.${c.id}.template`);
          const label = t(`chat_window.followup_chips.${c.id}.label`);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => sendCommand({ text, autoSubmit: true })}
              title={label}
              aria-label={label}
              className={`${FOLLOWUP_CHIP_BASE} ${
                INTENT_CHIP_BORDER[c.id] ?? CHIP_BTN_FALLBACK_BORDER
              }`}
            >
              <span>{c.icon}</span>
              <span className="hidden md:inline ml-1">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Desktop only : inline chip strip between textarea and toolbar.
export function ActivitiesChipStrip({
  workspace,
  activeThread,
  sendCommand,
  textareaRef,
}) {
  const { t } = useTranslation();
  const visible = getVisibleChips(workspace);
  const threadTitle = activeThread?.name?.trim() || "";

  if (!visible.length) return null;

  return (
    <div className="overflow-x-auto no-scrollbar pt-2 pb-1">
      <div className="inline-flex gap-1.5 pr-2">
        {visible.map((c) => {
          const template = t(`sara.intent_chips.${c.id}.template`);
          const text = buildText(template, threadTitle);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                sendCommand({ text, autoSubmit: false });
                textareaRef?.current?.focus();
              }}
              className={`text-[11px] md:text-xs px-2.5 py-1 rounded-full border bg-zinc-800/95 hover:bg-zinc-700 text-zinc-200 hover:text-white light:bg-white light:text-slate-700 light:hover:bg-slate-50 shadow-sm transition-colors whitespace-nowrap ${
                INTENT_CHIP_BORDER[c.id] ?? CHIP_BTN_FALLBACK_BORDER
              }`}
            >
              {c.icon} {t(`sara.intent_chips.${c.id}.label`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
