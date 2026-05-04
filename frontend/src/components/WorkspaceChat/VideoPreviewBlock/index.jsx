import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import renderMarkdown from "@/utils/chat/markdown";

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
      <div className="my-2 w-full rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2 flex items-center gap-2">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
        <p className="text-[11px] leading-snug text-emerald-300 light:text-emerald-700">
          Préparation de la vidéo…
        </p>
      </div>
    );
  }

  const { slide1, totalSlides } = data;
  const title = slide1?.title || "Vidéo en préparation";
  const description = slide1?.description || "";

  // markdown-it wraps single-line content in <p>…</p> ; pour un <h3> on l'enlève.
  const stripWrappingP = (html) =>
    html.replace(/^\s*<p>([\s\S]*?)<\/p>\s*$/, "$1").trim();

  const titleHtml = stripWrappingP(DOMPurify.sanitize(renderMarkdown(title)));
  const descriptionHtml = description
    ? DOMPurify.sanitize(renderMarkdown(description))
    : null;

  return (
    <div className="my-3 w-full rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-500/[0.04] light:bg-emerald-50/40">
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        {/* En-tête : badge "1ère slide" + indicateur de progression */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 light:bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 light:text-emerald-700 border border-emerald-500/20 light:border-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            1ère slide · aperçu
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-300/80 light:text-emerald-700/80">
            <div className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
            <span>Rendu de {totalSlides || "?"} slides…</span>
          </div>
        </div>

        {/* Titre de la slide 1 */}
        <h3
          className="video-preview-title text-base sm:text-lg font-semibold text-white light:text-slate-900 leading-snug mb-1.5"
          dangerouslySetInnerHTML={{ __html: titleHtml }}
        />

        {/* Description de la slide 1 */}
        {descriptionHtml && (
          <div
            className="text-sm text-zinc-200 light:text-slate-700 leading-relaxed [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:text-white light:[&_strong]:text-slate-900 [&_strong]:font-semibold [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-emerald-500/10 [&_code]:text-emerald-200 light:[&_code]:bg-emerald-100 light:[&_code]:text-emerald-800 [&_code]:text-[0.92em]"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}

        {/* Pied de page : message rassurant pour l'élève */}
        <p className="mt-3 pt-2.5 border-t border-emerald-500/10 light:border-emerald-200 text-[11px] text-emerald-200/70 light:text-emerald-700/70">
          Lis cette première slide pendant que les autres se construisent. La
          vidéo complète arrive dans quelques secondes.
        </p>
      </div>
    </div>
  );
}
