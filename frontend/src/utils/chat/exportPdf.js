import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const A4 = { w: 210, h: 297 };
const MARGIN = 10;

function safeName(name) {
  return (
    String(name || "sara-export")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "sara-export"
  );
}

/**
 * Exporte un nœud DOM en PDF A4 portrait, paginé si trop haut.
 * Utilisé pour les fiches de révision (HTML).
 */
export async function exportNodeToPdf(node, filename = "fiche-revision") {
  if (!node) return;
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = A4.w - MARGIN * 2;
  const pageH = A4.h - MARGIN * 2;
  const ratio = canvas.width / pageW;
  const imgHmm = canvas.height / ratio;

  if (imgHmm <= pageH) {
    pdf.addImage(imgData, "PNG", MARGIN, MARGIN, pageW, imgHmm);
  } else {
    let y = 0;
    while (y < imgHmm) {
      pdf.addImage(imgData, "PNG", MARGIN, MARGIN - y, pageW, imgHmm);
      y += pageH;
      if (y < imgHmm) pdf.addPage();
    }
  }
  pdf.save(`${safeName(filename)}.pdf`);
}

/**
 * Exporte un <svg> Markmap en PDF A4 paysage.
 * Sérialise le SVG, le rastérise dans un canvas, puis ajoute la description si fournie.
 */
export async function exportSvgToPdf(
  svg,
  filename = "carte-mentale",
  description = ""
) {
  if (!svg) return;
  const clone = svg.cloneNode(true);
  const bbox = svg.getBoundingClientRect();
  const w = Math.ceil(bbox.width) || 1200;
  const h = Math.ceil(bbox.height) || 800;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);

  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const dataUrl = `data:image/svg+xml;base64,${svg64}`;

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = A4.h - MARGIN * 2;
  const pageH = A4.w - MARGIN * 2;
  const ratio = Math.min(pageW / w, pageH / h);
  const drawW = w * ratio;
  const drawH = h * ratio;
  const x = (A4.h - drawW) / 2;
  const y = MARGIN;
  pdf.addImage(imgData, "PNG", x, y, drawW, drawH);

  if (description && description.trim()) {
    const descY = Math.min(y + drawH + 8, A4.w - MARGIN - 6);
    pdf.setFontSize(11);
    pdf.setTextColor(40, 40, 40);
    const lines = pdf.splitTextToSize(description.trim(), pageW);
    pdf.text(lines, MARGIN, descY);
  }

  pdf.save(`${safeName(filename)}.pdf`);
}
