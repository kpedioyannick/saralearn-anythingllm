import React, { useEffect, useRef, useState, memo } from "react";
import { API_BASE } from "@/utils/constants";
import VideoUrlBlock from "./VideoUrlBlock";

const POLL_INTERVAL = 3000;

// Cache module-scope partagé entre toutes les instances de VideoBlock.
// Chaque entrée est keyée sur la chaîne `content` (le JSON complet du payload),
// donc deux requêtes identiques retombent sur le même job côté serveur.
//
// But : empêcher qu'un remount du composant (causé p.ex. par un autre message
// qui streame en parallèle dans le même thread) déclenche une NOUVELLE
// génération vidéo et fasse "clignoter/recharger" la vidéo déjà rendue.
//
// Forme : Map<content, { videoId, videoUrl, status, quality, errorMsg }>.
const videoCache = new Map();

function VideoBlock({ content }) {
  const cached = videoCache.get(content) || null;
  const [status, setStatus] = useState(cached?.status || "parsing");
  const [videoUrl, setVideoUrl] = useState(cached?.videoUrl || null);
  const [errorMsg, setErrorMsg] = useState(cached?.errorMsg || null);
  const [videoId, setVideoId] = useState(cached?.videoId || null);
  const [quality, setQuality] = useState(cached?.quality || "preview");
  const [upgrading, setUpgrading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    // Si le cache a déjà l'URL finale, on rebranche directement sans POST.
    const c = videoCache.get(content);
    if (c?.videoUrl && c?.status === "done") return;

    // Si le cache a déjà un videoId mais pas encore l'URL, on reprend le poll
    // sur l'ancien job au lieu d'en créer un nouveau (cas remount mid-render).
    if (c?.videoId && !c?.videoUrl) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${API_BASE}/sara/video/${c.videoId}`);
          const d = await r.json();
          if (d.status === "done") {
            clearInterval(pollRef.current);
            const next = { ...c, status: "done", videoUrl: d.videoUrl, quality: d.quality || "preview" };
            videoCache.set(content, next);
            setVideoUrl(d.videoUrl);
            setQuality(d.quality || "preview");
            setStatus("done");
          } else if (d.status === "error") {
            clearInterval(pollRef.current);
            videoCache.set(content, { ...c, status: "error", errorMsg: d.error || "Erreur de rendu." });
            setStatus("error");
            setErrorMsg(d.error || "Erreur de rendu.");
          } else {
            setStatus(d.status);
          }
        } catch {
          clearInterval(pollRef.current);
          setStatus("error");
          setErrorMsg("Impossible de joindre le service vidéo.");
        }
      }, POLL_INTERVAL);
      return () => clearInterval(pollRef.current);
    }

    let payload;
    try {
      const raw = content.trim();
      // Extraire le premier objet JSON valide même si du texte l'entoure
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("no json");
      payload = JSON.parse(match[0]);
      if (!payload.slides || !Array.isArray(payload.slides)) throw new Error("no slides");
    } catch {
      setStatus("error");
      setErrorMsg("JSON de slides invalide.");
      return;
    }

    setStatus("queued");

    fetch(`${API_BASE}/sara/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.videoId) throw new Error(data.error || "Pas de videoId");
        setVideoId(data.videoId);
        videoCache.set(content, { videoId: data.videoId, status: "rendering" });
        pollRef.current = setInterval(async () => {
          try {
            const r = await fetch(`${API_BASE}/sara/video/${data.videoId}`);
            const d = await r.json();
            if (d.status === "done") {
              clearInterval(pollRef.current);
              videoCache.set(content, {
                videoId: data.videoId,
                videoUrl: d.videoUrl,
                quality: d.quality || "preview",
                status: "done",
              });
              setVideoUrl(d.videoUrl);
              setQuality(d.quality || "preview");
              setStatus("done");
            } else if (d.status === "error") {
              clearInterval(pollRef.current);
              videoCache.set(content, { videoId: data.videoId, status: "error", errorMsg: d.error });
              setStatus("error");
              setErrorMsg(d.error || "Erreur de rendu.");
            } else {
              setStatus(d.status);
            }
          } catch {
            clearInterval(pollRef.current);
            setStatus("error");
            setErrorMsg("Impossible de joindre le service vidéo.");
          }
        }, POLL_INTERVAL);
      })
      .catch((e) => {
        setStatus("error");
        setErrorMsg(e.message);
      });

    return () => clearInterval(pollRef.current);
  }, [content]);

  // Lance un upgrade vers la qualité HD : le même job se relance en scale 1.
  const handleUpgradeHD = async () => {
    if (!videoId || upgrading) return;
    setUpgrading(true);
    try {
      await fetch(`${API_BASE}/sara/video/${videoId}/upgrade`, { method: "POST" });
      // Re-poll : on attend que le statut repasse à "done" avec quality:hd.
      setStatus("rendering");
      setVideoUrl(null);
      pollRef.current = setInterval(async () => {
        const r = await fetch(`${API_BASE}/sara/video/${videoId}`);
        const d = await r.json();
        if (d.status === "done") {
          clearInterval(pollRef.current);
          // Cache-bust pour forcer le browser à recharger le MP4 ré-encodé.
          setVideoUrl(`${d.videoUrl}?v=${Date.now()}`);
          setQuality(d.quality || "hd");
          setStatus("done");
          setUpgrading(false);
        } else if (d.status === "error") {
          clearInterval(pollRef.current);
          setStatus("error");
          setErrorMsg(d.error || "Erreur HD.");
          setUpgrading(false);
        }
      }, POLL_INTERVAL);
    } catch (e) {
      setUpgrading(false);
    }
  };

  if (status === "done" && videoUrl) {
    return (
      <div className="my-2 w-full min-w-0 sm:my-4">
        <VideoUrlBlock src={videoUrl} />
        {quality !== "hd" && (
          <button
            type="button"
            onClick={handleUpgradeHD}
            disabled={upgrading}
            className="mt-2 px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-emerald-500/40 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25 disabled:opacity-50 disabled:cursor-wait"
          >
            {upgrading ? "Rendu HD en cours…" : "🎬 Télécharger en HD (1080p)"}
          </button>
        )}
      </div>
    );
  }

  const labels = {
    parsing: "Préparation des slides…",
    queued: "En attente de génération…",
    rendering: "Rendu vidéo en cours…",
    error: errorMsg || "Erreur inconnue.",
  };

  return (
    <div className="my-2 w-full min-w-0 sm:my-4 rounded-lg sm:rounded-xl border border-emerald-500/20 bg-zinc-900/60 px-2.5 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
      {status !== "error" ? (
        <>
          <div className="h-3.5 w-3.5 sm:h-5 sm:w-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
          <p className="min-w-0 text-[11px] leading-snug text-emerald-300 sm:text-sm">
            {labels[status]}
          </p>
        </>
      ) : (
        <>
          <span className="shrink-0 text-sm text-red-400 sm:text-base" role="img" aria-hidden>
            ⚠️
          </span>
          <p className="min-w-0 text-[11px] leading-snug text-red-300 sm:text-sm">{labels.error}</p>
        </>
      )}
    </div>
  );
}

// memo sur la prop `content` (string) : évite que VideoBlock se re-exécute à
// chaque render parent provoqué par le streaming d'un autre message dans le
// même thread. Sans ça, même si le DOM finit identique, le pipeline JSX est
// recalculé → flicker visible quand plusieurs vidéos coexistent.
export default memo(VideoBlock);
