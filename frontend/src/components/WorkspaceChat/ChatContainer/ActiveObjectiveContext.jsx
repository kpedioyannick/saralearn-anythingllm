import React, { createContext, useContext, useEffect, useState } from "react";
import { Target, CheckCircle } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import useUser from "@/hooks/useUser";

const STATUS_ORDER = { struggling: 0, in_progress: 1, todo: 2, validated: 3 };
const VALIDATED_THRESHOLD = 10;

const ActiveObjectiveContext = createContext(null);

/**
 * Provider qui maintient l'objectif "actif" du thread (= dernier objectif
 * tenté qui n'est pas encore validé, sinon le premier in_progress, sinon
 * le premier todo). Refetch à chaque thread + sur event `sara:exerciseSaved`.
 */
export function ActiveObjectiveProvider({ activeThread, children }) {
  const { user } = useUser();
  const [objective, setObjective] = useState(null);

  async function load() {
    const tid = activeThread?.id;
    if (!tid) {
      setObjective(null);
      return;
    }
    const params = new URLSearchParams({
      threadId: String(tid),
      deviceId: getDeviceId(),
    });
    if (user?.id) params.set("userId", String(user.id));
    try {
      const r = await fetch(
        `${API_BASE}/v1/user/exercises/objectives?${params}`
      );
      const data = await r.json();
      const list = Array.isArray(data.objectives) ? data.objectives : [];
      // Dernier tenté non validé (plus d'attempted, status != validated),
      // sinon premier in_progress par STATUS_ORDER, sinon premier todo.
      const attempted = list
        .filter((o) => (o.attempted || 0) > 0 && o.status !== "validated")
        .sort((a, b) => (b.attempted || 0) - (a.attempted || 0));
      let pick = attempted[0] || null;
      if (!pick) {
        const sorted = [...list].sort(
          (a, b) =>
            (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
        );
        pick =
          sorted.find((o) => o.status === "in_progress") ||
          sorted.find((o) => o.status === "todo") ||
          sorted[0] ||
          null;
      }
      setObjective(pick);
    } catch {
      setObjective(null);
    }
  }

  useEffect(() => {
    load();
    const onExo = () => load();
    window.addEventListener("sara:exerciseSaved", onExo);
    return () => window.removeEventListener("sara:exerciseSaved", onExo);
  }, [activeThread?.id, user?.id]);

  return (
    <ActiveObjectiveContext.Provider value={{ objective, refresh: load }}>
      {children}
    </ActiveObjectiveContext.Provider>
  );
}

export function useActiveObjective() {
  return useContext(ActiveObjectiveContext) || { objective: null };
}

/**
 * Ligne compacte rendue sous la metrics-line de chaque message.
 * Affiche : 🎯 <titre objectif> · <attempted>/<threshold> (<successPct>%)
 */
export function ActiveObjectiveLine() {
  const { objective } = useActiveObjective();
  if (!objective || !objective.title) return null;

  const attempted = objective.attempted || 0;
  const correct = objective.correct || 0;
  const isValidated = objective.status === "validated";
  const successPct = attempted > 0 ? Math.round((correct / attempted) * 100) : null;

  return (
    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400 light:text-slate-500">
      {isValidated ? (
        <CheckCircle size={12} weight="fill" className="text-emerald-500 shrink-0" />
      ) : (
        <Target size={12} weight="fill" className="text-emerald-500 shrink-0" />
      )}
      <span className="font-medium text-zinc-300 light:text-slate-600 truncate max-w-[60vw] md:max-w-[420px]">
        {objective.title}
      </span>
      <span className="tabular-nums text-zinc-500 light:text-slate-400">
        · {attempted}/{VALIDATED_THRESHOLD}
        {successPct !== null && ` (${successPct}%)`}
      </span>
    </div>
  );
}
