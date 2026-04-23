import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, SpeakerHigh, Pause, Play } from "@phosphor-icons/react";

export default function PhaseReading({
  currentPhrase,
  totalPhrases,
  state,
  onPause,
  onResume,
  onFinish,
}) {
  const { t } = useTranslation();
  const isRelecture = currentPhrase >= totalPhrases;
  const progress = Math.min((currentPhrase / totalPhrases) * 100, 100);
  const isPaused = state === "paused";

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex items-center gap-2 text-emerald-300 light:text-emerald-800">
        <SpeakerHigh
          size={20}
          weight="fill"
          className={isPaused ? "opacity-40" : "animate-pulse"}
        />
        <span className="text-sm font-semibold">
          {isPaused
            ? "En pause…"
            : isRelecture
            ? "Relecture finale…"
            : `Phrase ${currentPhrase + 1} / ${totalPhrases}`}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="w-full max-w-xs h-1.5 bg-emerald-900/45 light:bg-emerald-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: "#22c55e" }}
        />
      </div>

      <p className="text-xs text-emerald-100/80 light:text-slate-600 text-center">
        {isPaused ? t("sara.dictee.paused_label") : t("sara.dictee.listening_label")}
      </p>

      <div className="flex items-center gap-3 mt-2">
        {/* Pause / Play */}
        {isPaused ? (
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm shadow-md transition-colors bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40"
          >
            <Play size={16} weight="fill" />
            {t("sara.dictee.resume")}
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow text-white transition-colors bg-zinc-700/80 hover:bg-zinc-600 light:bg-slate-600 light:hover:bg-slate-500"
          >
            <Pause size={16} weight="fill" />
            {t("sara.dictee.pause")}
          </button>
        )}

        {/* J'ai fini */}
        <button
          onClick={onFinish}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm shadow-md transition-colors bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40"
        >
          <CheckCircle size={16} weight="fill" />
          {t("sara.dictee.finished")}
        </button>
      </div>
    </div>
  );
}
