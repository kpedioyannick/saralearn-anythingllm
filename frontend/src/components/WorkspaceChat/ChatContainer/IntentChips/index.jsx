import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

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

function getVisibleChips(workspace) {
  return CHIPS.filter((c) => !c.showWhen || c.showWhen(workspace));
}

// Template ouvert (finit par espace) => on ajoute le titre du thread comme sujet.
// Template complet (dictee, brevet) => pas de concat.
function buildText(template, threadTitle) {
  return template.endsWith(" ") && threadTitle ? template + threadTitle : template;
}

const CHIP_BTN_CLASS =
  "text-xs md:text-sm px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 light:text-emerald-700 transition-colors whitespace-nowrap";

function ChipButton({ chip, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={CHIP_BTN_CLASS}>
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
            className="z-[60] bg-zinc-900 light:bg-white border border-emerald-500/30 rounded-xl shadow-xl p-3 overflow-y-auto"
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
              className="text-[11px] md:text-xs px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 light:text-emerald-700 transition-colors whitespace-nowrap"
            >
              {c.icon} {t(`sara.intent_chips.${c.id}.label`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
