import React, { useState } from "react";
import MultiSlot from "./MultiSlot";

export default function Hint({ text, lang }) {
  const [shown, setShown] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-3">
      {shown ? (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded px-3 py-2">
          <MultiSlot value={text} lang={lang} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
        >
          💡 Indice
        </button>
      )}
    </div>
  );
}
