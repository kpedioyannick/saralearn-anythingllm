import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Explication from "../Explication";

export default function QCM({ question, answers, explication, onAnswer, answered }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const correctIdxs = answers.reduce((acc, a, i) => (a.correct ? [...acc, i] : acc), []);

  const submit = () => {
    if (selected === null) return;
    onAnswer(answers[selected].correct);
  };

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <p className="font-semibold mb-3 text-gray-800 dark:text-gray-100">{question}</p>
      <div className="flex flex-col gap-2">
        {answers.map((ans, i) => {
          let cls = "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ";
          if (answered === undefined) {
            cls += selected === i
              ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-gray-800 dark:text-gray-100"
              : "border-gray-200 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300";
          } else {
            if (ans.correct) cls += "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium";
            else if (i === answered) cls += "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300";
            else cls += "border-gray-200 dark:border-gray-600 text-gray-400 opacity-60";
          }
          return (
            <label key={i} className={cls} onClick={() => answered === undefined && setSelected(i)}>
              <input type="radio" name={`qcm-${question}`} checked={selected === i} onChange={() => {}} disabled={answered !== undefined} className="accent-green-600" />
              {ans.text}
            </label>
          );
        })}
      </div>
      {answered === undefined && (
        <button onClick={submit} disabled={selected === null} className="mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "#118c44" }}>
          {t("sara.quiz.validate")}
        </button>
      )}
      {answered !== undefined && (
        <>
          <p className={`mt-2 text-sm font-medium ${answers[selected]?.correct ? "text-green-600" : "text-red-500"}`}>
            {answers[selected]?.correct ? t("sara.quiz.correct") : t("sara.quiz.wrong_answer", { answer: answers.find((a) => a.correct)?.text })}
          </p>
          <Explication text={explication} isCorrect={answers[selected]?.correct} />
        </>
      )}
    </div>
  );
}
