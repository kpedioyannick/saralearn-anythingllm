/**
 * Parse le HTML rendu par markdown pour extraire les blocs riches.
 * Retourne un tableau de segments : { type: "html"|"quiz"|"dictee"|"geogebra"|"markmap", content }
 * Les blocs HTML intermédiaires sont groupés pour minimiser les re-renders.
 */
export function parseRichBlocks(html) {
  const parts = [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild;

  let htmlBuf = "";

  for (const node of root.childNodes) {
    const cls = node.classList;
    if (node.nodeType === Node.ELEMENT_NODE && cls) {
      if (cls.contains("quiz-block") || cls.contains("dictee-block") || cls.contains("geogebra-block") || cls.contains("markmap-block") || cls.contains("probleme-block") || cls.contains("video-block") || cls.contains("video-url-block") || cls.contains("h5p-block")) {
        if (htmlBuf) { parts.push({ type: "html", content: htmlBuf }); htmlBuf = ""; }
        const type = cls.contains("quiz-block") ? "quiz"
          : cls.contains("dictee-block") ? "dictee"
          : cls.contains("geogebra-block") ? "geogebra"
          : cls.contains("probleme-block") ? "probleme"
          : cls.contains("video-url-block") ? "video-url"
          : cls.contains("video-block") ? "video"
          : cls.contains("h5p-block") ? "h5p"
          : "markmap";
        parts.push({ type, content: decodeURIComponent(node.dataset.content || "") });
        continue;
      }
    }
    // Nœud HTML normal
    htmlBuf += node.nodeType === Node.ELEMENT_NODE ? node.outerHTML : node.textContent;
  }

  if (htmlBuf) parts.push({ type: "html", content: htmlBuf });
  return parts;
}
