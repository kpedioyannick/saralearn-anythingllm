import React, { useMemo } from "react";

// Affiche la slide 1 d'une vidéo en cours de rendu (patience active).
// Reçoit le bloc ```video-preview qui contient { videoId, slide1, totalSlides }.
// Le composant est démonté quand le serveur émet ensuite le bloc ```video-url final.
export default function VideoPreviewBlock({ content }) {
  const data = useMemo(() => {
    try {
      const m = (content || "").match(/\{[\s\S]*\}/);
      if (!m) return null;
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }, [content]);

  if (!data) {
    return (
      <div className="my-2 w-full rounded-lg sm:rounded-xl border border-emerald-500/20 bg-zinc-900/60 px-3 py-2 sm:py-3 flex items-center gap-2">
        <div className="h-3.5 w-3.5 sm:h-5 sm:w-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
        <p className="text-[11px] leading-snug text-emerald-300 sm:text-sm">Préparation de la vidéo…</p>
      </div>
    );
  }

  const { slide1, totalSlides } = data;
  const title = slide1?.title || "Vidéo en préparation";
  const description = slide1?.description || "";

  return (
    <div className="my-2 sm:my-4 w-full rounded-lg sm:rounded-xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-zinc-900/80 to-zinc-900/60 shadow-lg">
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        {/* En-tête : badge "1ère slide" + indicateur de progression */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/25 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-emerald-200 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            1ère slide · aperçu
          </span>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-300/80">
            <div className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
            <span>Rendu de {totalSlides || "?"} slides…</span>
          </div>
        </div>

        {/* Titre de la slide 1 */}
        <h3 className="text-base sm:text-xl font-semibold text-white leading-tight mb-2">
          {title}
        </h3>

        {/* Description de la slide 1 */}
        {description ? (
          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        ) : null}

        {/* Pied de page : message rassurant pour l'élève */}
        <div className="mt-4 pt-3 border-t border-emerald-500/15">
          <p className="text-[10px] sm:text-xs text-emerald-200/70 italic">
            Lis cette première slide pendant que les autres se construisent. La vidéo complète arrive dans quelques secondes.
          </p>
        </div>
      </div>
    </div>
  );
}
