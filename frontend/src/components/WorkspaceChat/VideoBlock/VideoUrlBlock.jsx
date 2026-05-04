import React, { memo } from "react";

// Composant mémoïsé pour afficher un mp4 déjà rendu (bloc ```video-url).
// - `memo` sur la prop `src` pour qu'aucun re-render parent (scroll, MAJ
//   d'autres messages, etc.) ne provoque de re-mount du <video> — ce qui
//   forcerait le navigateur à recharger les métadonnées et remettrait la
//   timeline à 0:00.
// - `contain: paint` + `translateZ(0)` isolent la couche compositée pour
//   éviter les flickers de re-décodage quand on scrolle au-dessus.
function VideoUrlBlock({ src }) {
  // aspect-ratio 16/9 réserve la hauteur AVANT que la metadata charge,
  // pour éviter le layout shift en cascade quand plusieurs vidéos sont
  // dans un même thread. object-contain gère les formats non-16:9 (lettrebox).
  return (
    <div
      className="my-2 w-full min-w-0 sm:my-4 rounded-lg sm:rounded-xl overflow-hidden border border-emerald-500/30 bg-black shadow-lg"
      style={{
        contain: "paint",
        transform: "translateZ(0)",
        aspectRatio: "16 / 9",
        maxHeight: "min(70dvh, 900px)",
      }}
    >
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="block w-full h-full object-contain bg-black"
      />
    </div>
  );
}

export default memo(VideoUrlBlock);
