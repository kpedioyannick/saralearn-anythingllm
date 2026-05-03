import React, { useState } from "react";
import MultiSlot from "../MultiSlot";
import Hint from "../Hint";

export default function QR({
  question,
  expected,
  hint,
  onAnswer,
  answered: _answered,
  lang,
}) {
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    setRevealed(true);
    const isCorrect =
      value.trim().toLowerCase() === (expected || "").trim().toLowerCase();
    onAnswer(isCorrect);
  };

  return (
    <div className="mb-2.5 last:mb-0 p-3 rounded-lg border border-gray-200/60 bg-white/50 dark:bg-white/[0.025] dark:border-white/10">
      <div className="font-semibold mb-3 text-gray-800 dark:text-gray-100">
        <MultiSlot value={question} lang={lang} />
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={revealed}
        rows={3}
        placeholder="Ta réponse..."
        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:border-green-500 resize-none"
      />
      {!revealed && <Hint text={hint} lang={lang} />}
      {!revealed && (
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="mt-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#118c44" }}
        >
          Valider
        </button>
      )}
      {revealed && expected && (
        <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">Réponse attendue : </span>
          <MultiSlot value={expected} lang={lang} />
        </div>
      )}
    </div>
  );
}
