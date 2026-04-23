import { useState, useRef, useCallback } from "react";
import { speak, cancelSpeech } from "./speech";

const PAUSE_BETWEEN_READS = 2500;
const PAUSE_BETWEEN_PHRASES = 7000;
const PAUSE_BEFORE_RELECTURE = 4000;

export default function useDicteePlayer(phrases) {
  const [state, setState] = useState("idle"); // idle | playing | paused | done
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const abortRef = useRef(false);
  const isPausedRef = useRef(false);
  const resumeCallbackRef = useRef(null);

  // Returns a promise that resolves immediately unless currently paused
  const waitIfPaused = useCallback(() => {
    if (!isPausedRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      resumeCallbackRef.current = resolve;
    });
  }, []);

  // Interruptible + pauseable delay
  const interruptiblePause = useCallback(
    async (ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (abortRef.current) return;
        await waitIfPaused();
        if (abortRef.current) return;
        const remaining = end - Date.now();
        if (remaining <= 0) break;
        await new Promise((r) => setTimeout(r, Math.min(remaining, 150)));
      }
    },
    [waitIfPaused]
  );

  const start = useCallback(async () => {
    abortRef.current = false;
    isPausedRef.current = false;
    setState("playing");

    for (let i = 0; i < phrases.length; i++) {
      if (abortRef.current) break;
      setCurrentPhrase(i);

      await speak(phrases[i], 0.85);
      if (abortRef.current) break;

      await interruptiblePause(PAUSE_BETWEEN_READS);
      if (abortRef.current) break;

      await speak(phrases[i], 0.75);
      if (abortRef.current) break;

      if (i < phrases.length - 1) {
        await interruptiblePause(PAUSE_BETWEEN_PHRASES);
      }
    }

    if (abortRef.current) return;

    setCurrentPhrase(phrases.length);
    await interruptiblePause(PAUSE_BEFORE_RELECTURE);
    if (!abortRef.current) await speak(phrases.join(" "), 0.85);
    if (!abortRef.current) setState("done");
  }, [phrases, interruptiblePause]);

  const pausePlayer = useCallback(() => {
    isPausedRef.current = true;
    window.speechSynthesis.pause();
    setState("paused");
  }, []);

  const resumePlayer = useCallback(() => {
    isPausedRef.current = false;
    window.speechSynthesis.resume();
    setState("playing");
    const cb = resumeCallbackRef.current;
    resumeCallbackRef.current = null;
    cb?.();
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    isPausedRef.current = false;
    cancelSpeech();
    resumeCallbackRef.current?.();
    resumeCallbackRef.current = null;
    setState("done");
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
    isPausedRef.current = false;
    cancelSpeech();
    resumeCallbackRef.current?.();
    resumeCallbackRef.current = null;
    setState("idle");
    setCurrentPhrase(0);
  }, []);

  return {
    state,
    currentPhrase,
    totalPhrases: phrases.length,
    start,
    stop,
    cancel,
    pausePlayer,
    resumePlayer,
  };
}
