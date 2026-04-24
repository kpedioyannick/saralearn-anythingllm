import React, { useState } from "react";
import ReactDOM from "react-dom";
import { CheckCircle, X } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";

export default function ContactModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "ok" | "error"

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

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[3px] sm:backdrop-blur-sm" />
      <div
        className="relative z-10 m-0 flex w-full max-w-md flex-col overflow-hidden border-zinc-600/40 bg-zinc-900/98 sm:m-0 sm:max-h-[min(92dvh,36rem)] sm:rounded-2xl sm:border sm:shadow-2xl sm:shadow-black/50 sm:ring-1 sm:ring-inset sm:ring-white/5 light:bg-white light:shadow-zinc-900/10 max-sm:max-h-[min(90dvh,32rem)] max-sm:rounded-t-3xl max-sm:border-x max-sm:border-t max-sm:border-b-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-600/30 bg-zinc-800/30 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5 light:border-zinc-200/80 light:bg-zinc-50/80">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-zinc-500/50 sm:hidden light:bg-zinc-300" aria-hidden />
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
              onClick={onClose}
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
              onClick={onClose}
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
