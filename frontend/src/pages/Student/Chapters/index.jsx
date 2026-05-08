import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Workspace from "@/models/workspace";
import WorkspaceThread from "@/models/workspaceThread";
import StudentLayout from "@/components/StudentLayout";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import { Target, CheckCircle, CaretDown } from "@phosphor-icons/react";
import useUser from "@/hooks/useUser";
import { getDeviceId } from "@/utils/deviceId";
import { API_BASE } from "@/utils/constants";

const STATUS_META = {
  validated: { dot: "bg-emerald-500", label: "Validé" },
  in_progress: { dot: "bg-amber-400", label: "En cours" },
  struggling: { dot: "bg-red-500", label: "À reprendre" },
  todo: { dot: "bg-slate-300", label: "À faire" },
};

async function fetchWorkspaceProgress({ workspaceId, userId }) {
  if (!workspaceId) return {};
  const params = new URLSearchParams({
    workspaceId: String(workspaceId),
    deviceId: getDeviceId(),
  });
  if (userId) params.set("userId", String(userId));
  try {
    const r = await fetch(
      `${API_BASE}/v1/user/exercises/objectives/by-workspace?${params}`
    );
    const data = await r.json();
    return data.progress || {};
  } catch {
    return {};
  }
}

async function fetchThreadObjectives({ threadId, userId }) {
  const params = new URLSearchParams({
    threadId: String(threadId),
    deviceId: getDeviceId(),
  });
  if (userId) params.set("userId", String(userId));
  try {
    const r = await fetch(`${API_BASE}/v1/user/exercises/objectives?${params}`);
    const data = await r.json();
    return Array.isArray(data.objectives) ? data.objectives : [];
  } catch {
    return [];
  }
}

function ChapterCard({ thread, index, slug, summary, userId }) {
  const [open, setOpen] = useState(false);
  const [objectives, setObjectives] = useState(null);

  const pct = summary.total > 0 ? Math.round((summary.validated / summary.total) * 100) : 0;
  const done = summary.total > 0 && summary.validated === summary.total;

  async function toggleObjectives(e) {
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next && objectives === null) {
      const list = await fetchThreadObjectives({ threadId: thread.id, userId });
      setObjectives(list);
    }
  }

  return (
    <li>
      <div className="flex flex-col rounded-3xl bg-white/95 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
        <Link
          to={paths.student.chat(slug, thread.slug)}
          className="p-4 flex flex-col gap-3 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shrink-0 border border-indigo-200">
              {index + 1}
            </span>
            <span className="flex-1 min-w-0 font-semibold text-base text-slate-800 line-clamp-2">
              {thread.name}
            </span>
            {done && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 shrink-0">
                <CheckCircle
                  size={16}
                  weight="fill"
                  className="text-emerald-500 shrink-0"
                  aria-label="Chapitre complet"
                />
                <span className="text-[11px] font-semibold text-emerald-700">
                  Termine
                </span>
              </span>
            )}
          </div>
          {summary.total > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                <Target size={14} className="text-emerald-600" weight="fill" />
                <span className="font-semibold text-slate-700">
                  {summary.validated}/{summary.total} objectifs
                </span>
                {summary.inProgress > 0 && (
                  <span className="text-amber-600 font-medium">
                    · {summary.inProgress} en cours
                  </span>
                )}
                <span className="ml-auto text-slate-600 tabular-nums px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={toggleObjectives}
                  aria-expanded={open}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  {open ? "Masquer les objectifs" : "Voir les objectifs"}
                  <CaretDown
                    size={12}
                    weight="bold"
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Pas encore d'objectifs définis
            </div>
          )}
        </Link>
        {open && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50/90">
            {objectives === null ? (
              <div className="text-xs text-slate-400 py-2">Chargement…</div>
            ) : objectives.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">
                Aucun objectif pour ce chapitre.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {objectives.map((o, i) => {
                  const meta = STATUS_META[o.status] || STATUS_META.todo;
                  return (
                    <li
                      key={o.id}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <span
                        className={`shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 ${meta.dot}`}
                        title={meta.label}
                        aria-label={meta.label}
                      />
                      <span className="text-slate-400 tabular-nums text-xs w-5 shrink-0 mt-0.5">
                        {i + 1}.
                      </span>
                      <span className="flex-1 leading-snug break-words">
                        {o.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function StudentChapters() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState(null);
  const [threads, setThreads] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    async function load() {
      const ws = await Workspace.bySlug(slug);
      if (!ws) {
        navigate(paths.student.home(), { replace: true });
        return;
      }
      const [{ threads: t }, prog] = await Promise.all([
        WorkspaceThread.all(slug),
        fetchWorkspaceProgress({ workspaceId: ws.id, userId: user?.id }),
      ]);
      setWorkspace(ws);
      setThreads(t || []);
      setProgress(prog || {});
    }
    load();
  }, [slug, navigate, user?.id]);

  if (workspace === null || threads === null) return <FullScreenLoader />;
  return (
    <StudentLayout title={workspace.name} backTo={paths.student.home()}>
      <div className="px-4 md:px-[50px] py-6 w-full">
        <p className="text-slate-600 mb-4 text-sm md:text-base">
          Choisis un chapitre pour discuter avec Sara.
        </p>
        {threads.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white/80 shadow-sm text-center text-slate-500 py-16 px-6">
            <p className="text-3xl mb-3" aria-hidden>
              🗂️
            </p>
            <p className="font-medium">
              Aucun chapitre n&apos;a encore ete prepare pour cette matiere.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 items-start">
            {threads.map((th, idx) => (
              <ChapterCard
                key={th.slug}
                thread={th}
                index={idx}
                slug={slug}
                summary={progress[th.id] || { total: 0, validated: 0, inProgress: 0 }}
                userId={user?.id}
              />
            ))}
          </ul>
        )}
      </div>
    </StudentLayout>
  );
}
