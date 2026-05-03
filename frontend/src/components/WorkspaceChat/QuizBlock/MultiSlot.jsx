import React from "react";
import useTTS from "@/hooks/useTTS";
import { tokenize } from "./tokenizer";

const ASSET_BASE = "/api/sara/asset";

function resolveImage(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return src;
  if (src.startsWith("emoji:")) return null;
  if (src.startsWith("mulberry:")) {
    const slug = src.slice("mulberry:".length).trim();
    // Endpoint serveur qui sert .svg (Mulberry) ou .png (ARASAAC) selon ce qui existe.
    return `${ASSET_BASE}/mulberry/${encodeURIComponent(slug)}`;
  }
  return src;
}

function resolveVideoUrl(token) {
  if (token.url) {
    if (/^https?:\/\//i.test(token.url)) return token.url;
    if (token.url.startsWith("/")) return token.url;
    return token.url;
  }
  if (token.kind === "articulation") {
    return `${ASSET_BASE}/articulation/${encodeURIComponent(token.key)}`;
  }
  if (token.kind === "lsf") {
    return `/api/sara/asset/lsf/${encodeURIComponent(token.key)}`;
  }
  return null;
}

function ImgSlot({ src }) {
  if (src && src.startsWith("emoji:")) {
    return <span className="text-2xl">{src.slice("emoji:".length)}</span>;
  }
  const url = resolveImage(src);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="inline-block max-h-32 align-middle rounded"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function TTSSlot({ text, lang }) {
  const { speak, supported } = useTTS(lang);
  if (!supported || !text) return null;
  // On NE PAS afficher le texte à côté : pour un exo "Quel mot entends-tu ?",
  // l'élève doit DEVINER en écoutant, pas lire la réponse.
  // Tooltip uniquement (pour debug/admin/parents qui veulent voir).
  return (
    <button
      type="button"
      onClick={() => speak(text, { lang })}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700/20 hover:bg-emerald-700/40 text-emerald-300 align-middle transition-colors"
      aria-label={`Écouter le son`}
      title={text}
    >
      🔊
    </button>
  );
}

function AudioSlot({ url }) {
  if (!url) return null;
  return (
    <audio
      controls
      preload="none"
      src={url}
      className="inline-block align-middle h-8"
    />
  );
}

function VideoSlot({ token }) {
  const url = resolveVideoUrl(token);
  if (!url) return null;
  if (/youtube\.com|youtu\.be/.test(url)) {
    const id = url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1];
    if (id) {
      return (
        <iframe
          className="block max-w-full rounded my-1"
          width="320"
          height="180"
          src={`https://www.youtube.com/embed/${id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }
  return (
    <video
      controls
      preload="metadata"
      src={url}
      className="inline-block max-h-40 align-middle rounded"
    />
  );
}

function TextSlot({ content }) {
  if (!content) return null;
  return <span>{content}</span>;
}

export default function MultiSlot({ value, items, lang, className = "" }) {
  const list = items || tokenize(value);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {list.map((item, i) => {
        if (item.type === "text")
          return <TextSlot key={i} content={item.content} />;
        if (item.type === "image") return <ImgSlot key={i} src={item.src} />;
        if (item.type === "tts")
          return <TTSSlot key={i} text={item.text} lang={lang} />;
        if (item.type === "audio") return <AudioSlot key={i} url={item.url} />;
        if (item.type === "video") return <VideoSlot key={i} token={item} />;
        return null;
      })}
    </span>
  );
}
