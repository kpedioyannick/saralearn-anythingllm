import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import MultiSlot from "../MultiSlot";
import Hint from "../Hint";
import Feedback from "../Feedback";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Etiquettes({
  segments,
  blanks,
  labels,
  hint,
  feedback_ok,
  feedback_ko,
  onAnswer,
  answered,
  lang,
}) {
  const { t } = useTranslation();
  const pool = useMemo(() => shuffle(labels.length ? labels : blanks), []);
  const [placed, setPlaced] = useState(Array(blanks.length).fill(null));
  const [selected, setSelected] = useState(null);

  const usedLabels = placed.filter(Boolean);

  const clickBlank = (i) => {
    if (answered !== undefined) return;
    if (placed[i]) {
      setSelected(placed[i]);
      setPlaced((p) => {
        const n = [...p];
        n[i] = null;
        return n;
      });
    } else if (selected) {
      setPlaced((p) => {
        const n = [...p];
        n[i] = selected;
        return n;
      });
      setSelected(null);
      const next = [...placed];
      next[i] = selected;
      if (next.every(Boolean)) {
        const correct = blanks.every((b, j) => next[j] === b);
        onAnswer(correct);
      }
    }
  };

  const clickLabel = (label) => {
    if (answered !== undefined || usedLabels.includes(label)) return;
    setSelected((s) => (s === label ? null : label));
  };

  const isCorrect = answered === true;

  return (
    <div className="mb-2.5 last:mb-0 p-3 rounded-lg border border-gray-200/60 bg-white/50 dark:bg-white/[0.025] dark:border-white/10">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {t("sara.quiz.place_labels")}
      </p>
      <div className="text-gray-800 dark:text-gray-100 text-sm leading-9 flex flex-wrap items-center gap-1 mb-4">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <MultiSlot value={seg} lang={lang} />
            {i < blanks.length && (
              <span
                onClick={() => clickBlank(i)}
                className={`inline-flex items-center justify-center min-w-[80px] px-2 py-0.5 rounded border-2 border-dashed text-xs font-semibold cursor-pointer transition-colors ${
                  placed[i]
                    ? answered !== undefined
                      ? placed[i] === blanks[i]
                        ? "border-green-500 bg-green-100 text-green-700"
                        : "border-red-400 bg-red-100 text-red-600"
                      : "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "border-gray-300 dark:border-gray-500 text-gray-400 hover:border-green-400"
                }`}
              >
                {placed[i] ? (
                  <MultiSlot value={placed[i]} lang={lang} />
                ) : (
                  "..."
                )}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((label) => {
          const isUsed = usedLabels.includes(label);
          const isSel = selected === label;
          return (
            <span
              key={label}
              onClick={() => clickLabel(label)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
                isUsed
                  ? "opacity-30 cursor-default border-gray-200 text-gray-400"
                  : isSel
                    ? "border-green-500 bg-green-100 text-green-700"
                    : "border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:border-green-400"
              }`}
            >
              <MultiSlot value={label} lang={lang} />
            </span>
          );
        })}
      </div>
      {answered === undefined && <Hint text={hint} lang={lang} />}
      {answered !== undefined && (
        <Feedback
          isCorrect={isCorrect}
          feedback_ok={feedback_ok}
          feedback_ko={feedback_ko}
          lang={lang}
        />
      )}
    </div>
  );
}
