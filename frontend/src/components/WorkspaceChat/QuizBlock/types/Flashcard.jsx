import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Flashcard({ front, back, onAnswer, answered }) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <div
        className="min-h-[100px] flex items-center justify-center rounded-lg cursor-pointer p-4 text-center transition-colors"
        style={{ backgroundColor: flipped ? "#f0fdf4" : "#f9fafb" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <p className="text-gray-800 dark:text-gray-100 font-medium text-base">
          {flipped ? back : front}
        </p>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">{t("sara.quiz.click_to_flip")}</p>
      {answered === undefined && flipped && (
        <div className="flex gap-3 mt-3">
          <button onClick={() => onAnswer(false)} className="flex-1 py-1.5 rounded-lg text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50">
            {t("sara.quiz.to_review")}
          </button>
          <button onClick={() => onAnswer(true)} className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#118c44" }}>
            {t("sara.quiz.i_knew")}
          </button>
        </div>
      )}
      {answered !== undefined && (
        <p className={`mt-2 text-sm font-medium text-center ${answered ? "text-green-600" : "text-orange-500"}`}>
          {answered ? t("sara.quiz.well_done") : t("sara.quiz.keep_revising")}
        </p>
      )}
    </div>
  );
}
