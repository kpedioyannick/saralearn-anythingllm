import React, { useEffect, useRef } from "react";

function extractMaterialId(url) {
  const trimmed = url.trim();
  // https://www.geogebra.org/m/wyQjRz5E  ou  wyQjRz5E
  const match = trimmed.match(/geogebra\.org\/(?:m|material\/iframe\/id)\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  // ID brut sans URL
  if (/^[A-Za-z0-9_-]{6,}$/.test(trimmed)) return trimmed;
  return null;
}

let scriptLoaded = false;
let scriptLoading = false;
const callbacks = [];

function loadGGBScript(cb) {
  if (scriptLoaded) return cb();
  callbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;
  const s = document.createElement("script");
  s.src = "https://www.geogebra.org/apps/deployggb.js";
  s.onload = () => {
    scriptLoaded = true;
    callbacks.forEach((fn) => fn());
    callbacks.length = 0;
  };
  document.head.appendChild(s);
}

export default function GeogebraBlock({ url }) {
  const containerRef = useRef(null);
  const materialId = extractMaterialId(url);

  useEffect(() => {
    if (!materialId || !containerRef.current) return;
    const el = containerRef.current;

    loadGGBScript(() => {
      if (!window.GGBApplet) return;
      el.innerHTML = "";
      const id = `ggb-${materialId}-${Math.random().toString(36).slice(2, 7)}`;
      const div = document.createElement("div");
      div.id = id;
      el.appendChild(div);

      const applet = new window.GGBApplet(
        {
          material_id: materialId,
          width: el.clientWidth || 700,
          height: 450,
          showToolBar: false,
          showAlgebraInput: false,
          showMenuBar: false,
          enableRightClick: false,
          enableLabelDrags: false,
          enableShiftDragZoom: true,
          showResetIcon: true,
          useBrowserForJS: false,
        },
        true
      );
      applet.inject(id);
    });
  }, [materialId]);

  if (!materialId) return null;

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">GeoGebra</span>
        <a
          href={`https://www.geogebra.org/m/${materialId}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray-400 hover:text-green-600 transition-colors"
        >
          Ouvrir ↗
        </a>
      </div>
      <div ref={containerRef} style={{ minHeight: 450 }} />
    </div>
  );
}
