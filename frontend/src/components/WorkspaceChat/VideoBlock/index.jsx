import React, { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/utils/constants";

const POLL_INTERVAL = 3000;

export default function VideoBlock({ content }) {
  const [status, setStatus] = useState("parsing"); // parsing | queued | rendering | done | error
  const [videoUrl, setVideoUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
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
        const videoId = data.videoId;
        pollRef.current = setInterval(async () => {
          try {
            const r = await fetch(`${API_BASE}/sara/video/${videoId}`);
            const d = await r.json();
            if (d.status === "done") {
              clearInterval(pollRef.current);
              setVideoUrl(d.videoUrl);
              setStatus("done");
            } else if (d.status === "error") {
              clearInterval(pollRef.current);
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
  }, []);

  if (status === "done" && videoUrl) {
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-emerald-500/30 bg-black shadow-lg">
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full max-h-[70vh]"
          style={{ display: "block" }}
        />
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
    <div className="my-4 rounded-xl border border-emerald-500/20 bg-zinc-900/60 p-4 flex items-center gap-3">
      {status !== "error" ? (
        <>
          <div className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-emerald-300">{labels[status]}</p>
        </>
      ) : (
        <>
          <span className="text-red-400 text-lg">⚠️</span>
          <p className="text-sm text-red-300">{labels.error}</p>
        </>
      )}
    </div>
  );
}
