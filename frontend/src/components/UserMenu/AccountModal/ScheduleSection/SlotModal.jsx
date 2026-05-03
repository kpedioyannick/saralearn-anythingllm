import { useEffect, useState } from "react";
import { Trash, X } from "@phosphor-icons/react";
import ModalWrapper from "@/components/ModalWrapper";
import Workspace from "@/models/workspace";
import WorkspaceThread from "@/models/workspaceThread";
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
  teacher: "",
  room: "",
  workspaceSlug: "",
  threadSlug: "",
  note: "",
};

export default function SlotModal({ slot, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...(slot || {}) });
  const [workspaces, setWorkspaces] = useState([]);
  const [threads, setThreads] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (form.type === "revision" && workspaces.length === 0) {
      Workspace.all().then((ws) => setWorkspaces(ws || []));
    }
  }, [form.type]);

  useEffect(() => {
    if (form.type !== "revision" || !form.workspaceSlug) {
      setThreads([]);
      return;
    }
    WorkspaceThread.all(form.workspaceSlug).then(({ threads }) => {
      setThreads((threads || []).filter((t) => !!t.slug && !t.deleted));
    });
  }, [form.type, form.workspaceSlug]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      type: form.type,
      title: form.title?.trim(),
      subject: form.subject?.trim(),
      dayOfWeek: form.dayOfWeek,
      start: form.start,
      end: form.end,
      recurrence: form.recurrence,
      date: form.recurrence === "once" ? form.date : null,
      note: form.note?.trim(),
      ...(form.type === "school"
        ? {
            teacher: form.teacher?.trim(),
            room: form.room?.trim(),
            workspaceSlug: null,
            threadSlug: null,
          }
        : {
            teacher: "",
            room: "",
            workspaceSlug: form.workspaceSlug || null,
            threadSlug: form.threadSlug || null,
          }),
    };
    await onSave(payload);
    setSubmitting(false);
  };

  return (
    <ModalWrapper isOpen={true}>
      <div className="w-full max-w-lg bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
        <div className="relative p-5 border-b border-theme-modal-border">
          <h3 className="text-lg font-semibold text-white">
            {slot ? "Modifier le créneau" : "Nouveau créneau"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 bg-transparent rounded-lg p-1 hover:bg-theme-modal-border"
          >
            <X size={20} weight="bold" className="text-white" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">
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
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                    form.type === opt.v
                      ? opt.v === "revision"
                        ? "bg-emerald-500/30 border-emerald-400 text-white"
                        : "bg-blue-500/30 border-blue-400 text-white"
                      : "bg-theme-bg-primary border-transparent text-white/70 hover:text-white"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">
              Titre
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
              maxLength={120}
              placeholder={
                form.type === "school"
                  ? "Maths, Français…"
                  : "Révision figures de style"
              }
              className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none focus:outline-primary-button"
            />
          </div>

          {/* Matière */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">
              Matière (optionnel)
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              maxLength={60}
              placeholder="maths, français, histoire…"
              className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none focus:outline-primary-button"
            />
          </div>

          {/* Jour + horaires */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Jour
              </label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => update("dayOfWeek", e.target.value)}
                className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
              >
                {DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Début
              </label>
              <input
                type="time"
                value={form.start}
                onChange={(e) => update("start", e.target.value)}
                required
                className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Fin
              </label>
              <input
                type="time"
                value={form.end}
                onChange={(e) => update("end", e.target.value)}
                required
                className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
              />
            </div>
          </div>

          {/* Récurrence */}
          <div className={form.recurrence === "once" ? "grid grid-cols-2 gap-2" : ""}>
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Récurrence
              </label>
              <select
                value={form.recurrence}
                onChange={(e) => update("recurrence", e.target.value)}
                className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
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
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date || ""}
                  onChange={(e) => update("date", e.target.value)}
                  required
                  className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
                />
              </div>
            )}
          </div>

          {/* Champs school */}
          {form.type === "school" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Professeur (optionnel)
                </label>
                <input
                  type="text"
                  value={form.teacher}
                  onChange={(e) => update("teacher", e.target.value)}
                  maxLength={80}
                  className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Salle (optionnel)
                </label>
                <input
                  type="text"
                  value={form.room}
                  onChange={(e) => update("room", e.target.value)}
                  maxLength={60}
                  className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
                />
              </div>
            </div>
          )}

          {/* Champs revision */}
          {form.type === "revision" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Workspace (optionnel)
                </label>
                <select
                  value={form.workspaceSlug || ""}
                  onChange={(e) => {
                    update("workspaceSlug", e.target.value);
                    update("threadSlug", "");
                  }}
                  className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none"
                >
                  <option value="">— Aucun —</option>
                  {workspaces.map((w) => (
                    <option key={w.slug} value={w.slug}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Thread (optionnel)
                </label>
                <select
                  value={form.threadSlug || ""}
                  onChange={(e) => update("threadSlug", e.target.value)}
                  disabled={!form.workspaceSlug || threads.length === 0}
                  className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none disabled:opacity-50"
                >
                  <option value="">— Aucun —</option>
                  {threads.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">
              Note (optionnel)
            </label>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              maxLength={500}
              rows={2}
              className="bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 border-none resize-y"
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
                className="text-white hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {submitting ? "..." : slot ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
