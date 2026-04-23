import React, { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Association({ pairs, onAnswer, answered }) {
  const { t } = useTranslation();
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), []);
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState({});
  // Conserve les matches finaux même si le composant re-render après answered
  const finalMatchesRef = useRef(null);

  const leftClick = (i) => {
    if (answered !== undefined || matches[i] !== undefined) return;
    if (selected?.side === "left" && selected.idx === i) { setSelected(null); return; }
    if (selected?.side === "right") {
      const next = { ...matches, [i]: selected.idx };
      setMatches(next);
      setSelected(null);
      checkDone(next);
    } else {
      setSelected({ side: "left", idx: i });
    }
  };

  const rightClick = (i) => {
    if (answered !== undefined || Object.values(matches).includes(i)) return;
    if (selected?.side === "right" && selected.idx === i) { setSelected(null); return; }
    if (selected?.side === "left") {
      const next = { ...matches, [selected.idx]: i };
      setMatches(next);
      setSelected(null);
      checkDone(next);
    } else {
      setSelected({ side: "right", idx: i });
    }
  };

  const checkDone = (m) => {
    if (Object.keys(m).length === pairs.length) {
      const correct = pairs.every((p, i) => rights[m[i]] === p.right);
      finalMatchesRef.current = m;
      onAnswer(correct);
    }
  };

  const getMatchColor = (leftIdx) => {
    const m = finalMatchesRef.current ?? matches;
    if (answered === undefined || m[leftIdx] === undefined) return "";
    return rights[m[leftIdx]] === pairs[leftIdx].right
      ? "border-green-500 bg-green-50 dark:bg-green-900/30"
      : "border-red-400 bg-red-50 dark:bg-red-900/30";
  };

  const displayMatches = finalMatchesRef.current ?? matches;

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("sara.quiz.match_pairs")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {pairs.map((p, i) => (
            <div
              key={i}
              onClick={() => leftClick(i)}
              className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                displayMatches[i] !== undefined
                  ? getMatchColor(i) || "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                  : selected?.side === "left" && selected.idx === i
                  ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-gray-800 dark:text-gray-100"
                  : "border-gray-200 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300"
              }`}
            >
              {p.left}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {rights.map((r, i) => {
            const used = Object.values(displayMatches).includes(i);
            const matchedLeftIdx = Object.entries(displayMatches).find(([, v]) => v === i)?.[0];
            let cls = "px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ";
            if (answered !== undefined && matchedLeftIdx !== undefined) {
              cls += rights[displayMatches[matchedLeftIdx]] === pairs[matchedLeftIdx].right
                ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300";
            } else if (used) {
              cls += "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-gray-600 dark:text-gray-400";
            } else if (selected?.side === "right" && selected.idx === i) {
              cls += "border-green-500 bg-green-50 dark:bg-green-900/30 text-gray-800 dark:text-gray-100";
            } else {
              cls += "border-gray-200 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300";
            }
            return (
              <div key={i} onClick={() => rightClick(i)} className={cls}>
                {r}
              </div>
            );
          })}
        </div>
      </div>
      {answered !== undefined && (
        <p className={`mt-3 text-sm font-medium ${answered ? "text-green-600" : "text-red-500"}`}>
          {answered ? t("sara.quiz.all_pairs_correct") : t("sara.quiz.some_wrong")}
        </p>
      )}
    </div>
  );
}
