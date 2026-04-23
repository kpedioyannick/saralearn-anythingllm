import React from "react";
import { useTranslation } from "react-i18next";
import { Play } from "@phosphor-icons/react";

export default function PhaseStart({ titre, niveau, phraseCount, onStart }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {titre && (
        <p className="font-bold text-emerald-50 light:text-slate-900 text-base text-center">
          {titre}
        </p>
      )}
      {niveau && (
        <p className="text-xs text-emerald-300/90 light:text-emerald-800 uppercase tracking-widest">
          {niveau}
        </p>
      )}
      <p className="text-sm text-emerald-100/85 light:text-slate-700 text-center">
        {phraseCount} phrase{phraseCount > 1 ? "s" : ""} — chaque phrase sera lue 2 fois
      </p>
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm shadow-md transition-colors bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40"
      >
        <Play size={18} weight="fill" />
        {t("sara.dictee.start")}
      </button>
    </div>
  );
}
