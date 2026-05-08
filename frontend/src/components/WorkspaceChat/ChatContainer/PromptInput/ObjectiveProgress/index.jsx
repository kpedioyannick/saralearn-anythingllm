import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  Target,
  CaretDown,
  CaretUp,
  X,
  ArrowSquareOut,
  Sparkle,
  Play,
  CheckCircle,
} from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import useUser from "@/hooks/useUser";

export const OBJECTIVES_SHEET_OPEN_EVENT = "sara:openObjectivesSheet";

const STATUS_ORDER = { struggling: 0, in_progress: 1, todo: 2, validated: 3 };

const STATUS_META = {
  struggling: {
    label: "À reprendre",
    dot: "bg-red-500",
    chip: "bg-red-500/15 text-red-300 light:text-red-700 light:bg-red-100",
    bar: "bg-red-500",
  },
  in_progress: {
    label: "En cours",
    dot: "bg-amber-400",
    chip:
      "bg-amber-500/15 text-amber-300 light:text-amber-700 light:bg-amber-100",
    bar: "bg-amber-500",
  },
  todo: {
    label: "À faire",
    dot: "bg-zinc-500",
    chip:
      "bg-zinc-500/15 text-zinc-300 light:text-slate-600 light:bg-slate-200",
    bar: "bg-zinc-500",
  },
  validated: {
    label: "Validé",
    dot: "bg-emerald-500",
    chip:
      "bg-emerald-500/15 text-emerald-300 light:text-emerald-700 light:bg-emerald-100",
    bar: "bg-emerald-500",
  },
};

async function fetchObjectives({ threadId, userId }) {
  if (!threadId) return [];
  const params = new URLSearchParams({
    threadId: String(threadId),
    deviceId: getDeviceId(),
  });
  if (userId) params.set("userId", String(userId));
  try {
    const r = await fetch(
      `${API_BASE}/v1/user/exercises/objectives?${params}`
    );
    const data = await r.json();
    return Array.isArray(data.objectives) ? data.objectives : [];
  } catch {
    return [];
  }
}

/**
 * AutoStartObjective — sur arrivée d'un thread vide qui a des objectifs,
 * auto-soumet une demande de fiche de révision sur l'objectif prioritaire
 * (1er in_progress, sinon 1er todo). Ne s'affiche pas, idempotent par thread.
 */
export function AutoStartObjective({ activeThread, sendCommand }) {
  const { user } = useUser();
  const firedRef = useRef(null);

  useEffect(() => {
    const tid = activeThread?.id;
    if (!tid || !sendCommand) return;
    if (firedRef.current === tid) return;
    firedRef.current = tid;

    let cancelled = false;
    (async () => {
      const list = await fetchObjectives({ threadId: tid, userId: user?.id });
      if (cancelled || list.length === 0) return;
      const sorted = [...list].sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      );
      const target =
        sorted.find((o) => o.status === "in_progress") ||
        sorted.find((o) => o.status === "todo") ||
        sorted[0];
      if (!target) return;
      sendCommand({
        text: `Fais-moi une fiche de révision sur "${target.title}".`,
        autoSubmit: true,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [activeThread?.id, user?.id]);

  return null;
}

/**
 * ObjectiveSheet — right-sheet (drawer droit) qui liste les objectifs du
 * thread courant avec leur progression. Ouvert par event global
 * `sara:openObjectivesSheet` (déclenché par le bouton "Mes objectifs").
 */
export function ObjectiveSheet({ activeThread, sendCommand }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OBJECTIVES_SHEET_OPEN_EVENT, onOpen);
    return () =>
      window.removeEventListener(OBJECTIVES_SHEET_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open || !activeThread?.id) return;
    setLoading(true);
    fetchObjectives({ threadId: activeThread.id, userId: user?.id })
      .then(setObjectives)
      .finally(() => setLoading(false));
  }, [open, activeThread?.id, user?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-refetch quand un nouvel exo est sauvegardé (progression peut changer)
  useEffect(() => {
    if (!open || !activeThread?.id) return;
    const onExo = () =>
      fetchObjectives({ threadId: activeThread.id, userId: user?.id }).then(
        setObjectives
      );
    window.addEventListener("sara:exerciseSaved", onExo);
    return () => window.removeEventListener("sara:exerciseSaved", onExo);
  }, [open, activeThread?.id, user?.id]);

  if (!open) return null;

  const total = objectives.length;
  const validated = objectives.filter((o) => o.status === "validated").length;
  const globalPct = total > 0 ? Math.round((validated / total) * 100) : 0;
  const sorted = [...objectives].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );

  const handleObjectiveClick = (obj) => {
    if (!sendCommand) return;
    sendCommand({
      text: `Donne-moi un exercice sur l'objectif : ${obj.title}`,
      autoSubmit: true,
    });
    setOpen(false);
  };

  const sheet = (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Mes objectifs"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 z-10 flex h-full w-[92%] max-w-[460px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${entered ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100">
            <Target size={20} weight="fill" className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-slate-800">
              Mes objectifs
            </div>
            <div className="text-xs text-slate-500 truncate">
              {activeThread?.name || "Chapitre"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        {total > 0 && (
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1.5">
              <span className="font-semibold text-slate-700">
                {validated}/{total} validés
              </span>
              <span className="ml-auto tabular-nums text-slate-500">
                {globalPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${globalPct}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Chargement…
            </div>
          ) : total === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Aucun objectif défini pour ce chapitre.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((o, i) => {
                const status = o.status in STATUS_META ? o.status : "todo";
                const meta = STATUS_META[status];
                const validatedThreshold = 10;
                const progressPct = Math.min(
                  100,
                  Math.round((o.attempted / validatedThreshold) * 100)
                );
                const successPct =
                  o.attempted > 0
                    ? Math.round((o.correct / o.attempted) * 100)
                    : null;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleObjectiveClick(o)}
                    className="group text-left flex items-stretch gap-2.5 p-3 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <span
                      className={`w-1 rounded-full shrink-0 ${meta.bar}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-slate-600 tabular-nums">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-slate-800 break-words">
                          {o.title}
                        </span>
                        {status === "validated" ? (
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="text-emerald-500 shrink-0"
                          />
                        ) : (
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${meta.chip}`}
                          >
                            {meta.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full transition-all ${meta.bar}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                          {o.attempted}/{validatedThreshold}
                          {successPct !== null && (
                            <span className="ml-1 text-slate-400">
                              · {successPct}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <Play
                      size={14}
                      weight="fill"
                      className="self-center text-slate-300 group-hover:text-emerald-600 shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheet, document.body);
}

export default function ObjectiveProgress({ activeThread, sendCommand }) {
  const { user } = useUser();
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const autoOpenedRef = useRef(false);

  const fetchProgress = async () => {
    if (!activeThread?.id) {
      setObjectives([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchObjectives({
        threadId: activeThread.id,
        userId: user?.id,
      });
      setObjectives(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    autoOpenedRef.current = false;
    setWelcomeDismissed(false);
    setOpen(false);
    fetchProgress();
    const onExo = () => fetchProgress();
    window.addEventListener("sara:exerciseSaved", onExo);
    return () => window.removeEventListener("sara:exerciseSaved", onExo);
  }, [activeThread?.id]);

  if (!activeThread?.id || objectives.length === 0) return null;

  const total = objectives.length;
  const validated = objectives.filter((o) => o.status === "validated").length;
  const inProgress = objectives.filter(
    (o) => o.status === "in_progress"
  ).length;
  const globalPct = Math.round((validated / total) * 100);
  const totalAttempted = objectives.reduce(
    (sum, o) => sum + (o.attempted || 0),
    0
  );
  const isWelcome = totalAttempted === 0 && !welcomeDismissed;

  const sorted = [...objectives].sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );

  const handleObjectiveClick = (obj) => {
    if (!sendCommand) return;
    sendCommand({
      text: `Donne-moi un exercice sur l'objectif : ${obj.title}`,
      autoSubmit: true,
    });
    setOpen(false);
  };

  const handleShowProgressInChat = () => {
    if (!sendCommand) return;
    sendCommand({
      text: "Quels sont les objectifs de ce chapitre et où j'en suis ?",
      autoSubmit: true,
    });
    setOpen(false);
  };

  const headerOpenStyle =
    "bg-emerald-600/25 hover:bg-emerald-600/30 border border-emerald-500/50 shadow-[0_4px_14px_rgba(16,185,129,0.18)] light:bg-emerald-100 light:hover:bg-emerald-200 light:border-emerald-400/70";
  const headerClosedStyle =
    "bg-zinc-800/40 hover:bg-zinc-800/70 border border-transparent light:bg-slate-100/70 light:hover:bg-slate-200";

  // Welcome card — affichée tant qu'aucun exo n'a été tenté sur ce chapitre
  if (isWelcome) {
    return (
      <div className="mb-3 px-1">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600/20 via-emerald-500/10 to-transparent border-2 border-emerald-500/40 shadow-[0_4px_24px_rgba(16,185,129,0.18)] light:from-emerald-50 light:via-emerald-50/60 light:to-white light:border-emerald-300 overflow-hidden">
          <div className="flex items-start gap-3 px-4 pt-4 pb-2">
            <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-emerald-500/20 light:bg-emerald-100">
              <Sparkle
                size={20}
                weight="fill"
                className="text-emerald-300 light:text-emerald-600"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white light:text-slate-800">
                Tes {total} objectifs pour ce chapitre
              </div>
              <div className="text-xs text-zinc-300 light:text-slate-600 mt-0.5">
                Choisis-en un pour commencer — Sara te proposera un exercice
                adapté.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWelcomeDismissed(true)}
              title="Réduire"
              className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/60 light:text-slate-400 light:hover:text-slate-700 light:hover:bg-slate-100"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          <div className="max-h-[42vh] overflow-y-auto px-3 pb-3 sidebar-scrollbar">
            <div className="flex flex-col gap-1.5">
              {sorted.slice(0, 12).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleObjectiveClick(o)}
                  disabled={loading}
                  className="group w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-400/40 light:bg-white light:hover:bg-emerald-50 light:border-slate-200 light:hover:border-emerald-300 transition-colors"
                >
                  <span
                    className="shrink-0 w-6 h-6 rounded-full bg-zinc-700/60 light:bg-slate-200 flex items-center justify-center text-[10px] font-bold text-zinc-300 light:text-slate-600 group-hover:bg-emerald-500/30 light:group-hover:bg-emerald-100"
                    aria-hidden
                  >
                    {sorted.indexOf(o) + 1}
                  </span>
                  <span className="flex-1 text-sm text-white light:text-slate-800 truncate">
                    {o.title}
                  </span>
                  <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 light:bg-emerald-100 light:text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white light:group-hover:bg-emerald-600 light:group-hover:text-white transition-colors">
                    <Play size={10} weight="fill" />
                    Démarrer
                  </span>
                </button>
              ))}
              {sorted.length > 12 && (
                <div className="text-[11px] text-zinc-400 light:text-slate-500 text-center pt-1">
                  + {sorted.length - 12} autres objectifs
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 px-1">
      {/* Bar compacte cliquable — accent quand ouverte */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs ${open ? headerOpenStyle : headerClosedStyle}`}
        title={open ? "Replier les objectifs" : "Voir le détail des objectifs"}
      >
        <Target
          size={14}
          className={open ? "text-emerald-300 light:text-emerald-700" : "text-zinc-400 light:text-slate-500"}
          weight="fill"
        />
        <span className="font-semibold text-white light:text-slate-700">
          {validated}/{total} objectifs
        </span>
        <span className="text-zinc-400 light:text-slate-500 font-medium">
          {globalPct}%
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-zinc-700/50 light:bg-slate-300 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${globalPct}%` }}
          />
        </div>
        {inProgress > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 light:bg-amber-100 light:text-amber-700">
            +{inProgress} en cours
          </span>
        )}
        {open ? (
          <span className="flex items-center gap-1 text-emerald-300 light:text-emerald-700 font-semibold">
            <X size={12} weight="bold" />
            Replier
          </span>
        ) : (
          <CaretDown size={12} className="text-gray-400" />
        )}
      </button>

      {/* Panel déroulant — hauteur capée, scroll interne, sticky footer */}
      {open && (
        <div className="mt-2 rounded-lg bg-zinc-900/80 light:bg-white border border-emerald-500/30 light:border-emerald-300 shadow-lg overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto p-2 sidebar-scrollbar">
            <div className="flex flex-col gap-1">
              {sorted.map((o) => {
                const status = o.status in STATUS_META ? o.status : "todo";
                const meta = STATUS_META[status];
                const validatedThreshold = 10;
                const progressPct = Math.min(
                  100,
                  Math.round((o.attempted / validatedThreshold) * 100)
                );
                const successPct =
                  o.attempted > 0
                    ? Math.round((o.correct / o.attempted) * 100)
                    : null;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleObjectiveClick(o)}
                    disabled={loading}
                    className="text-left flex items-stretch gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/60 light:hover:bg-slate-100 transition-colors group"
                  >
                    <span
                      className={`w-1 rounded-full shrink-0 ${meta.bar}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white light:text-slate-800 truncate">
                          {o.title}
                        </span>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-zinc-700/60 light:bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full transition-all ${meta.bar}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 light:text-slate-500 tabular-nums shrink-0">
                          {o.attempted}/{validatedThreshold}
                          {successPct !== null && (
                            <span className="ml-1 text-gray-500 light:text-slate-400">
                              · {successPct}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Sticky footer : Replier + Voir détail */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-emerald-500/30 light:border-emerald-300 bg-zinc-900/95 light:bg-white">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 light:text-emerald-700 light:hover:text-emerald-900"
            >
              <CaretUp size={12} weight="bold" />
              Replier
            </button>
            <button
              type="button"
              onClick={handleShowProgressInChat}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 light:text-slate-500 light:hover:text-slate-700 hover:underline"
            >
              Voir détail dans le chat
              <ArrowSquareOut size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
