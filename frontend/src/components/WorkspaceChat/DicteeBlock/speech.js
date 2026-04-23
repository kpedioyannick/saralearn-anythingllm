const PUNCTUATION_MAP = [
  [/,/g, " virgule "],
  [/\./g, " point "],
  [/\?/g, " point d'interrogation "],
  [/!/g, " point d'exclamation "],
  [/;/g, " point-virgule "],
  [/:/g, " deux points "],
  [/«|»/g, " guillemet "],
  [/\s{2,}/g, " "],
];

export function announcePunctuation(text) {
  return PUNCTUATION_MAP.reduce((t, [re, rep]) => t.replace(re, rep), text).trim();
}

export function speak(text, rate = 0.85, lang = "fr-FR") {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(announcePunctuation(text));
    u.lang = lang;
    u.rate = rate;
    u.onend = resolve;
    u.onerror = resolve; // ne pas bloquer la queue sur erreur
    window.speechSynthesis.speak(u);
  });
}

export function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cancelSpeech() {
  window.speechSynthesis.cancel();
}
