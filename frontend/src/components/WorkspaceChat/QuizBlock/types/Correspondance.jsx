import React from "react";
import Association from "./Association";
import MultiSlot from "../MultiSlot";

export default function Correspondance({
  title,
  pairs,
  hint,
  feedback_ok,
  feedback_ko,
  onAnswer,
  answered,
  lang,
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      {title && (
        <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">
          <MultiSlot value={title} lang={lang} />
        </div>
      )}
      <Association
        pairs={pairs}
        hint={hint}
        feedback_ok={feedback_ok}
        feedback_ko={feedback_ko}
        onAnswer={onAnswer}
        answered={answered}
        lang={lang}
      />
    </div>
  );
}
