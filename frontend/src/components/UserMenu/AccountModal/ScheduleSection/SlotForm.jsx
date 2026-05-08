import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trash, X } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import WorkspaceThread from "@/models/workspaceThread";
import paths from "@/utils/paths";
import { DAYS, RECURRENCES } from "./utils";

const DEFAULTS = {
  type: "revision",
  title: "",
  subject: "",
  dayOfWeek: "mon",
  start: "18:00",
  end: "19:00",
  recurrence: "weekly",
  date: "",
  workspaceSlug: "",
  threadSlug: "",
  threadLabel: "",
  note: "",
};

export default function SlotForm({ slot, onClose, onSave, onDelete, onNavigate }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...(slot || {}) });
  const [workspaces, setWorkspaces] = useState([]);
  const [threads, setThreads] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [matiereInput, setMatiereInput] = useState(form.subject || "");
  const [threadInput, setThreadInput] = useState(form.threadLabel || "");

  const matierePrefilled = useRef(false);
  const threadPrefilled = useRef(false);

  useEffect(() => {
    Workspace.all().then((ws) => setWorkspaces(ws || []));
  }, []);

  useEffect(() => {
    if (matierePrefilled.current || workspaces.length === 0) return;
    matierePrefilled.current = true;
    if (form.workspaceSlug) {
      const ws = workspaces.find((w) => w.slug === form.workspaceSlug);
      if (ws) setMatiereInput(ws.name);
    }
  }, [workspaces, form.workspaceSlug]);

  const resolvedWorkspace = useMemo(() => {
    const txt = (matiereInput || "").trim().toLowerCase();
    if (!txt) return null;
    return (
      workspaces.find((w) => (w?.name || "").toLowerCase() === txt) || null
    );
  }, [matiereInput, workspaces]);

  useEffect(() => {
    if (!resolvedWorkspace?.slug) {
      setThreads([]);
      return;
    }
    WorkspaceThread.all(resolvedWorkspace.slug).then(({ threads }) => {
      setThreads((threads || []).filter((t) => !!t.slug && !t.deleted));
    });
  }, [resolvedWorkspace?.slug]);

  useEffect(() => {
    if (threadPrefilled.current || threads.length === 0) return;
    threadPrefilled.current = true;
    if (form.threadSlug) {
      const th = threads.find((t) => t.slug === form.threadSlug);
      if (th) setThreadInput(th.name);
    }
  }, [threads, form.threadSlug]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const matiereTxt = (matiereInput || "").trim();
    if (!matiereTxt) {
      window.alert("Choisis ou tape une matière avant d'enregistrer.");
      return;
    }
    if (form.recurrence === "once" && !form.date) {
      window.alert(
        "Une date est requise quand la récurrence est « Une seule fois »."
      );
      return;
    }
    if (form.start >= form.end) {
      window.alert("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setSubmitting(true);

    const threadTxt = (threadInput || "").trim();
    const wsMatch = matiereTxt
      ? workspaces.find(
          (w) => (w?.name || "").toLowerCase() === matiereTxt.toLowerCase()
        )
      : null;
    const thMatch =
      threadTxt && wsMatch
        ? threads.find(
            (t) => (t?.name || "").toLowerCase() === threadTxt.toLowerCase()
          )
        : null;

    const payload = {
      type: form.type,
      title: matiereTxt,
      subject: matiereTxt,
      dayOfWeek: form.dayOfWeek,
      start: form.start,
      end: form.end,
      recurrence: form.recurrence,
      date: form.recurrence === "once" ? form.date : null,
      note: form.note?.trim(),
      teacher: "",
      room: "",
      workspaceSlug: wsMatch?.slug || null,
      threadSlug: thMatch?.slug || null,
      threadLabel: thMatch ? "" : threadTxt,
    };
    await onSave(payload);
    setSubmitting(false);
  };

  const matiereListId = "slot-matiere-list";
  const threadListId = "slot-thread-list";
  const threadDisabled = !resolvedWorkspace;

  // SlotForm sits inside AccountModal's outer <form>. HTML5 disallows nested
  // forms, so the inner <form> would be silently dropped and any submit/Enter
  // would fire the OUTER form (closing the right-sheet). We use a <div> root
  // and absorb Enter ourselves to keep submission scoped to this component.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-400/40 light:border-emerald-300 bg-theme-bg-primary light:bg-white overflow-hidden shadow-lg">
      <div className="relative px-4 py-3 border-b border-theme-modal-border bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10">
        <h4 className="text-sm font-semibold text-white light:text-slate-800">
          {slot ? "Modifier le créneau" : "Nouveau créneau"}
        </h4>
        <button
          onClick={onClose}
          type="button"
          className="absolute top-2 right-2 bg-transparent rounded-lg p-1 hover:bg-theme-modal-border light:hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="Fermer"
        >
          <X size={18} weight="bold" className="text-white light:text-slate-700" />
        </button>
      </div>

      <div onKeyDown={handleKeyDown} className="p-4 space-y-3">
        {slot && slot.workspaceSlug && (
          <Link
            to={
              slot.threadSlug
                ? paths.workspace.thread(slot.workspaceSlug, slot.threadSlug)
                : paths.workspace.chat(slot.workspaceSlug)
            }
            onClick={() => onNavigate?.()}
            className={`flex items-center justify-center gap-x-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors no-underline ${
              slot.type === "school"
                ? "bg-blue-500/30 border border-blue-400 text-white hover:bg-blue-500/40 light:bg-blue-100 light:border-blue-500 light:text-blue-900 light:hover:bg-blue-200"
                : "bg-emerald-500/30 border border-emerald-400 text-white hover:bg-emerald-500/40 light:bg-emerald-100 light:border-emerald-500 light:text-emerald-900 light:hover:bg-emerald-200"
            }`}
          >
            {slot.type === "school"
              ? "Travailler mon cours"
              : "Travailler ma révision"}
            <ArrowRight size={16} weight="bold" />
          </Link>
        )}

        <div>
          <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
            Type
          </label>
          <div className="flex gap-x-2">
            {[
              { v: "revision", l: "Révision" },
              { v: "school", l: "Cours" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => update("type", opt.v)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  form.type === opt.v
                    ? opt.v === "revision"
                      ? "bg-emerald-500/30 border-emerald-400 text-white light:text-emerald-900 light:bg-emerald-100 light:border-emerald-500"
                      : "bg-blue-500/30 border-blue-400 text-white light:text-blue-900 light:bg-blue-100 light:border-blue-500"
                    : "bg-theme-bg-secondary border-zinc-700 text-white/70 hover:text-white light:bg-slate-100 light:border-slate-300 light:text-slate-700 light:hover:bg-slate-200"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
            Matière
          </label>
          <input
            type="text"
            list={matiereListId}
            value={matiereInput}
            onChange={(e) => {
              setMatiereInput(e.target.value);
              setThreadInput("");
            }}
            maxLength={60}
            placeholder="Choisis dans la liste ou tape une matière…"
            className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200 focus:outline-primary-button"
          />
          <datalist id={matiereListId}>
            {workspaces.map((w) => (
              <option key={w.slug} value={w.name} />
            ))}
          </datalist>
          {resolvedWorkspace ? (
            <p className="mt-1 text-[11px] text-emerald-300/80 light:text-emerald-700">
              Lié au workspace « {resolvedWorkspace.name} »
            </p>
          ) : matiereInput.trim() ? (
            <p className="mt-1 text-[11px] text-white/40 light:text-slate-500">
              Libellé libre — non lié à un workspace
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
            Thread (optionnel)
          </label>
          <input
            type="text"
            list={threadListId}
            value={threadInput}
            onChange={(e) => setThreadInput(e.target.value)}
            disabled={threadDisabled}
            maxLength={120}
            placeholder={
              threadDisabled
                ? "Choisis d'abord une matière liée à un workspace"
                : "Choisis un thread existant ou tape un libellé"
            }
            className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200 focus:outline-primary-button disabled:opacity-50"
          />
          <datalist id={threadListId}>
            {threads.map((t) => (
              <option key={t.slug} value={t.name} />
            ))}
          </datalist>
          {!threadDisabled && threadInput.trim() && (
            <p className="mt-1 text-[11px] text-white/40 light:text-slate-500">
              {threads.some(
                (t) =>
                  (t?.name || "").toLowerCase() ===
                  threadInput.trim().toLowerCase()
              )
                ? "Lié à un thread existant"
                : "Libellé libre — aucun thread pinné"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
              Jour
            </label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => update("dayOfWeek", e.target.value)}
              className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200"
            >
              {DAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
              Début
            </label>
            <input
              type="time"
              value={form.start}
              onChange={(e) => update("start", e.target.value)}
              required
              className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
              Fin
            </label>
            <input
              type="time"
              value={form.end}
              onChange={(e) => update("end", e.target.value)}
              required
              className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200"
            />
          </div>
        </div>

        <div className={form.recurrence === "once" ? "grid grid-cols-2 gap-2" : ""}>
          <div>
            <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
              Récurrence
            </label>
            <select
              value={form.recurrence}
              onChange={(e) => {
                const next = e.target.value;
                setForm((f) => ({
                  ...f,
                  recurrence: next,
                  date:
                    next === "once" && !f.date
                      ? new Date().toISOString().slice(0, 10)
                      : f.date,
                }));
              }}
              className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200"
            >
              {RECURRENCES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {form.recurrence === "once" && (
            <div>
              <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.date || ""}
                onChange={(e) => update("date", e.target.value)}
                required
                className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-white/80 light:text-slate-600 mb-1">
            Note (optionnel)
          </label>
          <textarea
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            maxLength={500}
            rows={2}
            className="bg-theme-settings-input-bg light:bg-slate-100 text-white light:text-slate-800 text-sm rounded-lg block w-full p-2 border border-transparent light:border-slate-200 resize-y"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-theme-modal-border">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-x-1 text-red-400 hover:text-red-300 text-sm"
            >
              <Trash size={16} /> Supprimer
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-x-2">
            <button
              type="button"
              onClick={onClose}
              className="text-white light:text-slate-700 hover:bg-zinc-700 light:hover:bg-slate-200 px-4 py-2 rounded-lg text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {submitting ? "..." : slot ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
