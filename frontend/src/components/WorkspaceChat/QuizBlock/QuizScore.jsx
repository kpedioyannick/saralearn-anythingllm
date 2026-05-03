import React from "react";
import { useTranslation } from "react-i18next";

export default function QuizScore({ correct, total }) {
  const { t } = useTranslation();
  const pct = Math.round((correct / total) * 100);
  const msg =
    pct === 100
      ? t("sara.quiz.score_perfect")
      : pct >= 60
        ? t("sara.quiz.score_good")
        : t("sara.quiz.score_keep_going");
  return (
    <div
      className="mt-4 p-3 rounded-xl text-center font-semibold text-white text-sm"
      style={{ backgroundColor: "#118c44" }}
    >
      {t("sara.quiz.score_label", { correct, total, msg })}
    </div>
  );
}
