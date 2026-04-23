import React from "react";
import { ArrowBendDownRight } from "@phosphor-icons/react";

export default function PhaseDone({ phrases }) {
  const fullText = phrases.join(" ");

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="p-4 rounded-xl bg-emerald-900/25 light:bg-emerald-100/60 border border-emerald-500/35 light:border-emerald-700/20">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 light:text-emerald-900 mb-2">
          Texte original
        </p>
        <p className="text-sm text-emerald-50 light:text-slate-900 leading-relaxed">{fullText}</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-[rgba(17,140,68,0.12)] light:bg-[rgba(17,140,68,0.08)] border border-emerald-500/30 light:border-emerald-700/20">
        <ArrowBendDownRight size={16} className="text-emerald-300 light:text-emerald-800 mt-0.5 shrink-0" />
        <p className="text-sm text-emerald-100 light:text-slate-700">
          Compare avec ce que tu as écrit, puis{" "}
          <strong>envoie ta dictée dans le chat</strong> (texte tapé ou photo de ta feuille)
          pour que je la corrige.
        </p>
      </div>
    </div>
  );
}
