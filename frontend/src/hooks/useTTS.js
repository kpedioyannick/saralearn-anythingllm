import { useCallback, useEffect, useRef } from "react";

const IOS_FALLBACK_VOICES = [
  { name: "Thomas", lang: "fr-FR" },
  { name: "Amelie", lang: "fr-FR" },
  { name: "Samantha", lang: "en-US" },
  { name: "Daniel", lang: "en-GB" },
  { name: "Anna", lang: "de-DE" },
  { name: "Monica", lang: "es-ES" },
  { name: "Alice", lang: "it-IT" },
];

let voicesCache = null;

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length) {
    voicesCache = voices;
    return voices;
  }
  return voicesCache || [];
}

function pickVoice(lang) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const target = (lang || "fr-FR").toLowerCase();
  let v = voices.find((x) => (x.lang || "").toLowerCase() === target);
  if (v) return v;
  const short = target.split("-")[0];
  v = voices.find((x) => (x.lang || "").toLowerCase().startsWith(short));
  if (v) return v;
  const fallback = IOS_FALLBACK_VOICES.find((x) =>
    x.lang.toLowerCase().startsWith(short)
  );
  return fallback || null;
}

export default function useTTS(defaultLang = "fr-FR") {
  const speakingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    loadVoices();
    const onChange = () => loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
    return () =>
      window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
  }, []);

  const speak = useCallback(
    (text, opts = {}) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      if (!text) return;
      const lang = opts.lang || defaultLang;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(String(text));
      utt.lang = lang;
      utt.rate = opts.rate ?? 1;
      utt.pitch = opts.pitch ?? 1;
      const voice = pickVoice(lang);
      if (voice && voice.voiceURI) utt.voice = voice;
      utt.onstart = () => {
        speakingRef.current = true;
      };
      utt.onend = () => {
        speakingRef.current = false;
      };
      utt.onerror = () => {
        speakingRef.current = false;
      };
      window.speechSynthesis.speak(utt);
    },
    [defaultLang]
  );

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speakingRef.current = false;
  }, []);

  const supported = typeof window !== "undefined" && !!window.speechSynthesis;

  return { speak, cancel, supported };
}
