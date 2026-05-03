import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Explication from "../Explication";
import MultiSlot from "../MultiSlot";
import Hint from "../Hint";
import Feedback from "../Feedback";

export default function VF({
  question,
  correct,
  explication,
  hint,
  feedback_ok,
  feedback_ko,
  onAnswer,
  answered,
  lang,
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);

  const submit = (val) => {
    setSelected(val);
    onAnswer(val === correct);
  };

  const btnCls = (val) => {
    let cls =
      "flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ";
    if (answered === undefined) {
      cls +=
        selected === val
          ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-400 cursor-pointer";
    } else {
      if (val === correct)
        cls +=
          "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      else if (val === selected)
        cls +=
          "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300";
      else cls += "border-gray-200 text-gray-400 opacity-50";
    }
    return cls;
  };

  const isCorrect = selected === correct;

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="font-semibold mb-3 text-gray-800 dark:text-gray-100">
        <MultiSlot value={question} lang={lang} />
      </div>
      <div className="flex gap-3">
        <button
          className={btnCls(true)}
          onClick={() => answered === undefined && submit(true)}
          disabled={answered !== undefined}
        >
          {t("sara.quiz.true")}
        </button>
        <button
          className={btnCls(false)}
          onClick={() => answered === undefined && submit(false)}
          disabled={answered !== undefined}
        >
          {t("sara.quiz.false")}
        </button>
      </div>
      {answered === undefined && <Hint text={hint} lang={lang} />}
      {answered !== undefined && (
        <>
          <p
            className={`mt-2 text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-500"}`}
          >
            {isCorrect
              ? t("sara.quiz.correct")
              : t("sara.quiz.wrong_vf", {
                  answer: correct ? t("sara.quiz.true") : t("sara.quiz.false"),
                })}
          </p>
          <Feedback
            isCorrect={isCorrect}
            feedback_ok={feedback_ok}
            feedback_ko={feedback_ko}
            lang={lang}
          />
          <Explication text={explication} isCorrect={isCorrect} />
        </>
      )}
    </div>
  );
}
