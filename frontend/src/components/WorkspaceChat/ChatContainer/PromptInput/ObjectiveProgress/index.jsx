import React, { useEffect, useState } from "react";
import { Target, CaretDown, CaretUp, X, ArrowSquareOut } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import useUser from "@/hooks/useUser";

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

export default function ObjectiveProgress({ activeThread, sendCommand }) {
  const { user } = useUser();
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchProgress = async () => {
    if (!activeThread?.id) {
      setObjectives([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        threadId: String(activeThread.id),
        deviceId: getDeviceId(),
      });
      if (user?.id) params.set("userId", String(user.id));
      const r = await fetch(
        `${API_BASE}/v1/user/exercises/objectives?${params}`
      );
      const data = await r.json();
      setObjectives(Array.isArray(data.objectives) ? data.objectives : []);
    } catch {
      setObjectives([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
