import React from "react";
import { parseDictee } from "./parser";
import useDicteePlayer from "./useDicteePlayer";
import PhaseStart from "./phases/PhaseStart";
import PhaseReading from "./phases/PhaseReading";
import PhaseDone from "./phases/PhaseDone";

export default function DicteeBlock({ content }) {
  const { titre, niveau, phrases } = parseDictee(content);
  const { state, currentPhrase, totalPhrases, start, stop, pausePlayer, resumePlayer } = useDicteePlayer(phrases);

  if (!phrases.length) return null;

  return (
    <div className="my-4 rounded-2xl border border-emerald-500/30 light:border-emerald-700/25 bg-[rgba(10,24,18,0.9)] light:bg-white px-4 md:px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] md:text-xs font-bold uppercase tracking-widest text-emerald-200 light:text-emerald-900">
          Dictée
        </p>
        <span className="text-[10px] md:text-xs font-medium text-emerald-200/90 light:text-emerald-800/90 bg-emerald-900/30 light:bg-emerald-200/70 px-2 py-0.5 rounded-full border border-emerald-400/30 light:border-emerald-700/25">
          Exercice audio
        </span>
      </div>

      {state === "idle" && (
        <PhaseStart
          titre={titre}
          niveau={niveau}
          phraseCount={phrases.length}
          onStart={start}
        />
      )}

      {(state === "playing" || state === "paused") && (
        <PhaseReading
          currentPhrase={currentPhrase}
          totalPhrases={totalPhrases}
          state={state}
          onPause={pausePlayer}
          onResume={resumePlayer}
          onFinish={stop}
        />
      )}

      {state === "done" && <PhaseDone phrases={phrases} />}
    </div>
  );
}
