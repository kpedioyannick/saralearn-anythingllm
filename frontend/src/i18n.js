import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { defaultNS, resources } from "./locales/resources";

// Detector custom : force la langue selon le sous-domaine.
// fr.sara.education → "fr", en.sara.education → "en". Sinon undefined →
// les détecteurs suivants (querystring, cookie, navigator) prennent la main.
const subdomainDetector = {
  name: "subdomain",
  lookup() {
    if (typeof window === "undefined") return undefined;
    const host = window.location.hostname.toLowerCase();
    const sub = host.split(".")[0];
    const supported = Object.keys(resources);
    return supported.includes(sub) ? sub : undefined;
  },
  cacheUserLanguage() {
    // Pas de cache : la source de vérité est l'URL, pas le cookie.
  },
};

const detector = new LanguageDetector();
detector.addDetector(subdomainDetector);

i18next
  .use(initReactI18next)
  .use(detector)
  .init({
    fallbackLng: "en",
    debug: import.meta.env.DEV,
    defaultNS,
    resources,
    lowerCaseLng: true,
    detection: {
      order: ["subdomain", "querystring", "cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage", "cookie"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Tient l'attribut <html lang="..."> à jour pour le SEO et les lecteurs d'écran.
const syncHtmlLang = (lng) => {
  if (typeof document !== "undefined" && lng) {
    document.documentElement.setAttribute("lang", lng);
  }
};
syncHtmlLang(i18next.resolvedLanguage);
i18next.on("languageChanged", syncHtmlLang);

export default i18next;
