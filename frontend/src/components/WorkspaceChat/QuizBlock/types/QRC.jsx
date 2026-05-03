import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Explication from "../Explication";
import MultiSlot from "../MultiSlot";
import Hint from "../Hint";
import Feedback from "../Feedback";

export default function QRC({
  question,
  answer,
  explication,
  hint,
  feedback_ok,
  feedback_ko,
  onAnswer,
  answered,
  lang,
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) return;
    const isCorrect =
      value.trim().toLowerCase() === answer.trim().toLowerCase();
    onAnswer(isCorrect);
  };

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="font-semibold mb-3 text-gray-800 dark:text-gray-100">
        <MultiSlot value={question} lang={lang} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) =>
          e.key === "Enter" && answered === undefined && submit()
        }
        disabled={answered !== undefined}
        placeholder={t("sara.quiz.placeholder_short")}
        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:border-green-500"
      />
      {answered === undefined && <Hint text={hint} lang={lang} />}
      {answered === undefined && (
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="mt-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#118c44" }}
        >
          {t("sara.quiz.validate")}
        </button>
      )}
      {answered !== undefined && (
        <>
          <p
            className={`mt-2 text-sm font-medium ${answered ? "text-green-600" : "text-red-500"}`}
          >
            {answered
              ? t("sara.quiz.correct")
              : t("sara.quiz.wrong_vf", { answer })}
          </p>
          <Feedback
            isCorrect={!!answered}
            feedback_ok={feedback_ok}
            feedback_ko={feedback_ko}
            lang={lang}
          />
          <Explication text={explication} isCorrect={answered} />
        </>
      )}
    </div>
  );
}
