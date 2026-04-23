import React from "react";
import { Lightbulb } from "@phosphor-icons/react";

export default function Explication({ text, isCorrect }) {
  if (!text) return null;
  return (
    <div className={`mt-2 flex items-start gap-2 p-2 rounded-lg text-xs ${
      isCorrect
        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
    }`}>
      <Lightbulb size={14} weight="fill" className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
