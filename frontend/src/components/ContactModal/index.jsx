import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X } from "@phosphor-icons/react";
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

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-500";

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Nous contacter</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        {status === "ok" ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-semibold text-base mb-1">Message envoyé !</p>
            <p className="text-gray-400 text-sm">Nous te répondrons dès que possible.</p>
            <button onClick={onClose} className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#118c44" }}>
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input type="text" placeholder="Ton prénom" required value={form.name} onChange={set("name")} className={inputCls} />
            <input type="email" placeholder="Ton email" required value={form.email} onChange={set("email")} className={inputCls} />
            <textarea placeholder="Ton message..." required rows={4} value={form.message} onChange={set("message")} className={`${inputCls} resize-none`} />
            {status === "error" && (
              <p className="text-red-500 text-sm text-center">Erreur lors de l'envoi. Réessaie.</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="py-2 rounded-lg font-semibold text-white text-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#118c44" }}
            >
              {status === "sending" ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
