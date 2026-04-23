import React, { useState } from "react";

export default function Trous({ segments, blanks, onAnswer, answered }) {
  const [inputs, setInputs] = useState(Array(blanks.length).fill(""));

  const submit = () => {
    const correct = blanks.every((b, i) => inputs[i].trim().toLowerCase() === b.toLowerCase());
    onAnswer(correct);
  };

  const set = (i, val) => setInputs((prev) => { const n = [...prev]; n[i] = val; return n; });

  return (
    <div className="mb-5 p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Complète le texte :</p>
      <p className="text-gray-800 dark:text-gray-100 text-sm leading-8 flex flex-wrap items-center gap-1">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <span>{seg}</span>
            {i < blanks.length && (
              answered === undefined ? (
                <input
                  type="text"
                  value={inputs[i]}
                  onChange={(e) => set(i, e.target.value)}
                  className="inline-block border-b-2 border-green-500 bg-transparent text-center text-sm w-24 focus:outline-none px-1"
                  placeholder="..."
                />
              ) : (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${inputs[i].trim().toLowerCase() === blanks[i].toLowerCase() ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {inputs[i] || "—"} {inputs[i].trim().toLowerCase() !== blanks[i].toLowerCase() && `(→ ${blanks[i]})`}
                </span>
              )
            )}
          </React.Fragment>
        ))}
      </p>
      {answered === undefined && (
        <button onClick={submit} disabled={inputs.some((v) => !v.trim())} className="mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "#118c44" }}>
          Valider
        </button>
      )}
    </div>
  );
}
