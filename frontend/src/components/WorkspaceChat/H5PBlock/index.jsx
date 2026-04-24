import React from "react";

/**
 * Rend un contenu H5P dans un iframe.
 * Accepte une URL complète vers h5p.sara.education/view/<shortName>/<slug>.
 */
export default function H5PBlock({ url }) {
  const trimmed = String(url || "").trim();
  if (!trimmed || !/^https?:\/\//.test(trimmed)) return null;

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-emerald-700/40 bg-zinc-900/60">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/80 border-b border-emerald-700/30">
        <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">
          🎯 Quiz interactif
        </span>
        <a
          href={trimmed}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
        >
          Ouvrir ↗
        </a>
      </div>
      <iframe
        src={trimmed}
        title="Quiz H5P"
        width="100%"
        height="500"
        frameBorder="0"
        allowFullScreen
        style={{ display: "block", border: "none" }}
      />
    </div>
  );
}
