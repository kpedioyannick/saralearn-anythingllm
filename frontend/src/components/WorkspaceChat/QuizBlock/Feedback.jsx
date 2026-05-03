import React from "react";
import MultiSlot from "./MultiSlot";

export default function Feedback({
  isCorrect,
  feedback_ok,
  feedback_ko,
  lang,
}) {
  const text = isCorrect ? feedback_ok : feedback_ko;
  if (!text) return null;
  return (
    <div
      className={`mt-1 text-sm ${isCorrect ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}
    >
      <MultiSlot value={text} lang={lang} />
    </div>
  );
}
