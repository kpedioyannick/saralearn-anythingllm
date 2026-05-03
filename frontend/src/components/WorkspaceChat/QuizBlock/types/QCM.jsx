import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Explication from "../Explication";
import MultiSlot from "../MultiSlot";
import Hint from "../Hint";
import Feedback from "../Feedback";

export default function QCM({
  question,
  answers,
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

  const submit = () => {
    if (selected === null) return;
    onAnswer(answers[selected].correct);
  };

  const selectedAns = selected !== null ? answers[selected] : null;
  const isCorrect = selectedAns?.correct;
  const perAns = isCorrect
    ? selectedAns?.feedback_ok
    : selectedAns?.feedback_ko;
  const finalOk = perAns && isCorrect ? perAns : feedback_ok;
  const finalKo = perAns && !isCorrect ? perAns : feedback_ko;

  return (
    <div className="mb-2.5 last:mb-0 p-3 rounded-lg border border-gray-200/60 bg-white/50 dark:bg-white/[0.025] dark:border-white/10">
      <div className="font-semibold mb-3 text-gray-800 dark:text-gray-100">
        <MultiSlot value={question} lang={lang} />
      </div>
      <div className="flex flex-col gap-2">
        {answers.map((ans, i) => {
          let cls =
            "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ";
          if (answered === undefined) {
            cls +=
              selected === i
                ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-gray-800 dark:text-gray-100"
                : "border-gray-200 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300";
          } else {
            if (ans.correct)
              cls +=
                "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium";
            else if (i === answered)
              cls +=
                "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300";
            else
              cls +=
                "border-gray-200 dark:border-gray-600 text-gray-400 opacity-60";
          }
          return (
            <label
              key={i}
              className={cls}
              onClick={() => answered === undefined && setSelected(i)}
            >
              <input
                type="radio"
                name={`qcm-${question}`}
                checked={selected === i}
                onChange={() => {}}
                disabled={answered !== undefined}
                className="accent-green-600"
              />
              <MultiSlot value={ans.text} lang={lang} />
            </label>
          );
        })}
      </div>
      {answered === undefined && <Hint text={hint} lang={lang} />}
      {answered === undefined && (
        <button
          onClick={submit}
          disabled={selected === null}
          className="mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#118c44" }}
        >
          {t("sara.quiz.validate")}
        </button>
      )}
      {answered !== undefined && (
        <>
          <p
            className={`mt-2 text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-500"}`}
          >
            {isCorrect
              ? t("sara.quiz.correct")
              : t("sara.quiz.wrong_answer", {
                  answer: answers.find((a) => a.correct)?.text,
                })}
          </p>
          <Feedback
            isCorrect={isCorrect}
            feedback_ok={finalOk}
            feedback_ko={finalKo}
            lang={lang}
          />
          <Explication text={explication} isCorrect={isCorrect} />
        </>
      )}
    </div>
  );
}
