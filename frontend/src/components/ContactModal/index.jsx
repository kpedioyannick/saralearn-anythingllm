import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { CheckCircle, X } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";

const SHEET_ANIM_MS = 280;

export default function ContactModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "ok" | "error"
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose?.(), SHEET_ANIM_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/sara/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  const fieldCls =
    "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-100 " +
    "placeholder:text-zinc-400/80 " +
    "focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 " +
    "transition-[border-color,box-shadow] sm:px-4 sm:py-3 " +
    "light:border-zinc-200 light:bg-white light:text-zinc-900 light:placeholder:text-zinc-400 light:focus:border-emerald-500/60";

  const visible = entered && !closing;

  const modal = (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 z-10 flex h-full w-[90%] max-w-[560px] flex-col overflow-hidden border-l border-zinc-600/40 bg-zinc-900/98 shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/5 transform transition-transform duration-300 ease-out light:bg-white light:shadow-zinc-900/10 ${visible ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-600/30 bg-zinc-800/30 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5 light:border-zinc-200/80 light:bg-zinc-50/80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="text-balance text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl light:text-zinc-900"
                id="contact-modal-title"
              >
                Nous contacter
              </h2>
              <p className="mt-0.5 text-pretty text-xs text-zinc-400 sm:text-sm light:text-zinc-600">
                Un message, une question : on te répond bientôt.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="shrink-0 rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-700/50 hover:text-zinc-200 light:hover:bg-zinc-200/80 light:text-zinc-500"
              aria-label="Fermer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        {status === "ok" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-zinc-900/95 px-4 py-8 text-center sm:px-5 sm:py-10 light:bg-white">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <CheckCircle className="text-emerald-400" size={32} weight="duotone" />
            </div>
            <p className="text-base font-semibold text-zinc-50 light:text-zinc-900">Message envoyé !</p>
            <p className="max-w-[18rem] text-sm text-zinc-400 light:text-zinc-600">Nous te répondrons dès que possible.</p>
            <button
              onClick={requestClose}
              type="button"
              className="mt-4 w-full max-w-xs rounded-xl bg-[#118c44] py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-[#0d7438] sm:mt-2"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-zinc-900/95 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5 light:bg-zinc-50/90"
          >
            <div className="space-y-3 sm:space-y-3.5">
              <input
                type="text"
                placeholder="Ton prénom"
                required
                value={form.name}
                onChange={set("name")}
                className={fieldCls}
              />
              <input
                type="email"
                placeholder="Ton email"
                required
                value={form.email}
                onChange={set("email")}
                className={fieldCls}
              />
              <textarea
                placeholder="Ton message…"
                required
                rows={4}
                value={form.message}
                onChange={set("message")}
                className={`${fieldCls} min-h-[6.5rem] resize-none sm:min-h-[7rem]`}
              />
            </div>
            {status === "error" && (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200 light:border-red-200/60 light:bg-red-50 light:text-red-800">
                {"Erreur lors de l'envoi. Réessaie."}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-1 w-full rounded-xl bg-[#118c44] py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/25 transition hover:bg-[#0d7438] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
            >
              {status === "sending" ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
