import React, { useEffect, useState } from "react";
import { Target, CaretDown, CaretUp } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import useUser from "@/hooks/useUser";

const STATUS_ICON = {
  todo: "⚪",
  in_progress: "🟡",
  validated: "🟢",
  struggling: "🔴",
};

const STATUS_LABEL = {
  todo: "À faire",
  in_progress: "En cours",
  validated: "Validé",
  struggling: "À reprendre",
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
    // Refresh quand un exercice vient d'être enregistré (event custom dispatché par QuizBlock)
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

  const handleObjectiveClick = (obj) => {
    if (!sendCommand) return;
    sendCommand(`Donne-moi un exercice sur l'objectif : ${obj.title}`, true);
    setOpen(false);
  };

  const handleShowProgressInChat = () => {
    if (!sendCommand) return;
    sendCommand(
      "Quels sont les objectifs de ce chapitre et où j'en suis ?",
      true
    );
    setOpen(false);
  };

  return (
    <div className="mb-2 px-1">
      {/* Bar compacte cliquable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/70 light:bg-slate-100/70 light:hover:bg-slate-200 transition-colors text-xs"
        title="Cliquer pour voir le détail des objectifs"
      >
        <Target size={14} className="text-zinc-400 light:text-slate-500" weight="fill" />
        <span className="font-semibold text-white light:text-slate-700">
          {validated}/{total} objectifs
        </span>
        <span className="text-zinc-400 light:text-slate-500 font-medium">{globalPct}%</span>
        <div className="flex-1 h-1.5 rounded-full bg-zinc-700/50 light:bg-slate-300 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${globalPct}%` }}
          />
        </div>
        {inProgress > 0 && (
          <span className="text-amber-400 text-[10px]">
            +{inProgress} en cours
          </span>
        )}
        {open ? (
          <CaretUp size={12} className="text-gray-400" />
        ) : (
          <CaretDown size={12} className="text-gray-400" />
        )}
      </button>

      {/* Détail déroulant */}
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-zinc-900/80 light:bg-white border border-zinc-700 light:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 light:text-slate-500">
              Clique sur un objectif pour t'entraîner dessus
            </p>
            <button
              type="button"
              onClick={handleShowProgressInChat}
              className="text-xs text-zinc-400 hover:text-zinc-200 light:text-slate-500 light:hover:text-slate-700 hover:underline"
            >
              Voir détail dans le chat →
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {objectives.map((o) => {
              const pct =
                o.attempted > 0
                  ? Math.round((o.correct / o.attempted) * 100)
                  : 0;
              const status = o.status;
              const validatedThreshold = 10;
              const progressPct = Math.min(
                100,
                Math.round((o.attempted / validatedThreshold) * 100)
              );
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleObjectiveClick(o)}
                  disabled={loading}
                  className="text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 light:hover:bg-slate-100 transition-colors group"
                  title={`${STATUS_LABEL[status]} · ${o.attempted} exos faits, ${o.correct} réussis (${pct}%)`}
                >
                  <span className="text-base">
                    {STATUS_ICON[status] || "⚪"}
                  </span>
                  <span className="flex-1 text-xs text-white light:text-slate-700 truncate group-hover:text-zinc-100 light:group-hover:text-slate-900">
                    {o.title}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-400 light:text-slate-500 tabular-nums">
                      {o.attempted}/{validatedThreshold}
                    </span>
                    <div className="w-16 h-1 rounded-full bg-zinc-700 light:bg-slate-300 overflow-hidden">
                      <div
                        className={`h-full transition-all ${status === "validated" ? "bg-emerald-500" : status === "struggling" ? "bg-red-500" : "bg-amber-500"}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
