import React, { useEffect, useRef, useState, useMemo } from "react";
import DOMPurify from "@/utils/chat/purify";
import renderMarkdown from "@/utils/chat/markdown";
import { parseRichBlocks } from "@/utils/chat/richParser";
import QuizBlock from "@/components/WorkspaceChat/QuizBlock";
import DicteeBlock from "@/components/WorkspaceChat/DicteeBlock";
import GeogebraBlock from "@/components/WorkspaceChat/GeogebraBlock";
import ProblemeBlock from "@/components/WorkspaceChat/ProblemeBlock";
import VideoBlock from "@/components/WorkspaceChat/VideoBlock";
import VideoPreviewBlock from "@/components/WorkspaceChat/VideoPreviewBlock";
import H5PBlock from "@/components/WorkspaceChat/H5PBlock";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { exportNodeToPdf, exportSvgToPdf } from "@/utils/chat/exportPdf";

function parseDescriptions(raw) {
  const map = {};
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (m && i + 1 < lines.length) {
      const cm = lines[i + 1].match(/^<!--\s*([\s\S]*?)\s*-->$/);
      if (cm) map[m[1].trim()] = cm[1].trim();
    }
  }
  return map;
}

function MarkmapBlock({ content }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Compat ascendante : on garde l'extraction des anciens commentaires HTML
  // (cartes mentales générées avant le passage à `description: ...`).
  const descriptions = useMemo(() => parseDescriptions(content), [content]);

  // Nouveau format : la 1re ligne du bloc peut être `description: <texte>`.
  // On l'extrait pour l'afficher en bas, et on retire cette ligne du markdown
  // passé à Markmap (sinon ça pollue la racine de l'arbre).
  const { description, mapBody } = useMemo(() => {
    const m = content.match(/^\s*description\s*:\s*([\s\S]*?)\n/i);
    if (m) {
      return {
        description: m[1].trim(),
        mapBody: content.slice(m[0].length),
      };
    }
    return { description: null, mapBody: content };
  }, [content]);

  const cleanContent = useMemo(
    () =>
      mapBody
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    [mapBody]
  );

  useEffect(() => {
    if (!containerRef.current || !cleanContent) return;
    containerRef.current.innerHTML = "";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = "100%";
    svg.style.height = "100%";
    containerRef.current.appendChild(svg);
    svgRef.current = svg;
    const { root } = new Transformer().transform(cleanContent);
    Markmap.create(svg, null, root);

    const handleNodeClick = (e) => {
      const fo = e.target.closest(".markmap-foreign");
      if (!fo) {
        setTooltip(null);
        return;
      }
      const text = fo.textContent?.trim();
      setTooltip(text && descriptions[text] ? descriptions[text] : null);
    };
    svg.addEventListener("click", handleNodeClick);
    return () => svg.removeEventListener("click", handleNodeClick);
  }, [cleanContent, descriptions]);

  const handleExport = async () => {
    if (!svgRef.current || exporting) return;
    setExporting(true);
    try {
      await exportSvgToPdf(svgRef.current, "carte-mentale", description || "");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="my-2 relative">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="absolute top-2 right-2 z-10 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white shadow disabled:opacity-60"
      >
        {exporting ? "..." : "📄 PDF"}
      </button>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: 300,
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
      {description && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-sm text-white/85 leading-relaxed light:bg-slate-100 light:border-slate-300 light:text-slate-700">
          {description}
        </div>
      )}
      {tooltip && (
        <div className="mt-2 px-4 py-3 rounded-xl bg-zinc-800/90 border border-emerald-700/40 text-sm text-white/85 leading-relaxed">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// Détecte une vraie fiche de révision structurée (marqueurs emoji du template)
function isFicheContent(html) {
  return (
    html.length > 600 &&
    (html.includes("🎯") || html.includes("📖") || html.includes("🔢")) &&
    (html.includes("<h1") || html.includes("<h2"))
  );
}

/**
 * Rend un message avec blocs riches comme vrais composants React.
 * Les keys stables empêchent le remontage pendant le streaming → plus de scintillement.
 */
export default function RichMessageRenderer({
  message,
  workspace,
  activeThread,
}) {
  const html = DOMPurify.sanitize(renderMarkdown(message));
  const parts = parseRichBlocks(html);
  const ficheBodyRef = useRef(null);
  const [exportingFiche, setExportingFiche] = useState(false);

  const htmlParts = parts.filter((p) => p.type === "html");
  const totalHtml = htmlParts.map((p) => p.content).join("");
  const isFiche = isFicheContent(totalHtml);

  const handleExportFiche = async () => {
    if (!ficheBodyRef.current || exportingFiche) return;
    setExportingFiche(true);
    try {
      await exportNodeToPdf(ficheBodyRef.current, "fiche-revision");
    } finally {
      setExportingFiche(false);
    }
  };

  const htmlContent = (
    <>
      {parts.map((part, i) => {
        if (part.type === "html") {
          return (
            <span
              key={`html-${i}`}
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }
        if (part.type === "quiz") {
          return (
            <QuizBlock
              key={`quiz-${part.content.slice(0, 40)}`}
              content={part.content}
              workspace={workspace}
              activeThread={activeThread}
            />
          );
        }
        if (part.type === "dictee") {
          return (
            <DicteeBlock
              key={`dictee-${part.content.slice(0, 40)}`}
              content={part.content}
            />
          );
        }
        if (part.type === "geogebra") {
          return (
            <GeogebraBlock key={`ggb-${part.content}`} url={part.content} />
          );
        }
        if (part.type === "probleme") {
          return (
            <ProblemeBlock
              key={`pb-${part.content.slice(0, 40)}`}
              content={part.content}
              workspace={workspace}
              activeThread={activeThread}
            />
          );
        }
        if (part.type === "markmap") {
          return (
            <MarkmapBlock
              key={`mm-${part.content.slice(0, 40)}`}
              content={part.content}
            />
          );
        }
        if (part.type === "video") {
          return (
            <VideoBlock
              key={`vid-${part.content.slice(0, 40)}`}
              content={part.content}
            />
          );
        }
        if (part.type === "video-preview") {
          return (
            <VideoPreviewBlock
              key={`vidp-${part.content.slice(0, 40)}`}
              content={part.content}
            />
          );
        }
        if (part.type === "video-url") {
          return (
            <div
              key={`vidu-${part.content.slice(0, 40)}`}
              className="my-2 w-full min-w-0 sm:my-4 rounded-lg sm:rounded-xl overflow-hidden border border-emerald-500/30 bg-black shadow-lg"
            >
              <video
                src={part.content}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="block w-full max-h-[min(52dvh,420px)] object-contain sm:max-h-[min(70dvh,900px)]"
              />
            </div>
          );
        }
        if (part.type === "h5p") {
          return <H5PBlock key={`h5p-${part.content}`} url={part.content} />;
        }
        return null;
      })}
    </>
  );

  if (isFiche) {
    return (
      <div className="w-full my-2 rounded-2xl border border-emerald-500/30 light:border-emerald-700/25 bg-[rgba(10,24,18,0.92)] light:bg-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* header bar */}
        <div className="flex items-center justify-between gap-2 px-4 md:px-5 py-2.5 border-b border-emerald-500/25 light:border-emerald-700/20 bg-[rgba(17,140,68,0.22)] light:bg-[rgba(17,140,68,0.1)]">
          <span className="text-[11px] md:text-xs font-semibold uppercase tracking-widest text-emerald-100 light:text-emerald-900">
            📄 Fiche de révision
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportFiche}
              disabled={exportingFiche}
              className="text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-60"
            >
              {exportingFiche ? "Export..." : "⬇ PDF"}
            </button>
            <span className="text-[10px] md:text-xs font-medium text-emerald-200/90 light:text-emerald-800/90 bg-emerald-900/30 light:bg-emerald-200/70 px-2 py-0.5 rounded-full border border-emerald-400/30 light:border-emerald-700/25">
              Format structuré
            </span>
          </div>
        </div>
        {/* scrollable content */}
        <div
          ref={ficheBodyRef}
          className="max-h-[65vh] overflow-y-auto px-4 md:px-7 py-4 md:py-5 break-words text-[15px] leading-[1.62] text-emerald-50 light:text-slate-900"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(34,197,94,0.7) rgba(17,140,68,0.2)",
          }}
        >
          {htmlContent}
        </div>
        {/* fade bottom hint */}
        <div className="h-6 bg-gradient-to-t from-[rgba(10,24,18,0.95)] light:from-white to-transparent pointer-events-none" />
      </div>
    );
  }

  return <span className="break-words">{htmlContent}</span>;
}
