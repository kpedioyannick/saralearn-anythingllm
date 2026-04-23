import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Ordre({ items, onAnswer, answered }) {
  const { t } = useTranslation();
  const shuffled = useMemo(() => shuffle(items), []);
  const [order, setOrder] = useState(shuffled);

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const submit = () => {
    const correct = order.every((item, i) => item === items[i]);
    onAnswer(correct);
  };

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("sara.quiz.reorder")}</p>
      <div className="flex flex-col gap-2">
        {order.map((item, i) => {
          let bg = "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600";
          if (answered !== undefined) {
            bg = item === items[i]
              ? "bg-green-50 dark:bg-green-900/30 border-green-400"
              : "bg-red-50 dark:bg-red-900/30 border-red-400";
          }
          return (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-800 dark:text-gray-100 ${bg}`}>
              <span className="flex-1">{item}</span>
              {answered === undefined && (
                <div className="flex gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {answered === undefined && (
        <button onClick={submit} className="mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#118c44" }}>
          {t("sara.quiz.validate")}
        </button>
      )}
      {answered !== undefined && (
        <div className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("sara.quiz.correct_order", { order: items.join(" → ") })}
        </div>
      )}
    </div>
  );
}
