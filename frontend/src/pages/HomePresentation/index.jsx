import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  FileText,
  GraduationCap,
  Target,
} from "@phosphor-icons/react";

const CONTENT = {
  fr: {
    badge: "Conforme au programme de l'Éducation nationale",
    navLogin: "Se connecter",
    heroTitleLine1: "Ton assistant scolaire",
    heroTitleAccent: "intelligent",
    heroDescription:
      "Sara t'accompagne de la 6e a la 3e dans toutes tes matieres. Revise tes cours, fais-toi aider pour tes devoirs, et progresse a ton rythme.",
    startNow: "Commencer maintenant",
    featuresTitle: "Tout ce dont tu as besoin pour reussir",
    featuresDescription:
      "Des outils penses pour les collegiens, alignes sur le programme officiel francais.",
    features: [
      {
        title: "Fiches de revision",
        text: "Des fiches claires pour chaque chapitre, avec exemples et erreurs frequentes.",
      },
      {
        title: "Aide aux devoirs",
        text: "Sara te guide etape par etape sans donner directement la reponse.",
      },
      {
        title: "Exercices adaptes",
        text: "Des exercices generes selon ton niveau et ta progression.",
      },
      {
        title: "Objectifs clairs",
        text: "Chaque notion est decoupee en objectifs precis et mesurables.",
      },
    ],
    curriculumTitle: "100% adapte au programme francais",
    curriculumDescription:
      "Chaque cours, exercice et fiche de revision est concu pour correspondre au programme officiel, de la 6e a la 3e.",
    curriculumBullets: [
      "Mathematiques, Physique-Chimie, SVT",
      "Francais, Histoire-Geographie",
      "Anglais, Espagnol",
      "Niveaux 6e, 5e, 4e et 3e",
    ],
    ctaTitle: "Pret a progresser ?",
    ctaDescription:
      "Rejoins Sara gratuitement et commence a reviser des maintenant.",
    ctaButton: "Creer mon compte",
    footer: "Sara - Assistant scolaire intelligent pour les collegiens",
    chatUser: "Je veux reviser le theoreme de Pythagore.",
    chatSara:
      "Bien sur. Dans un triangle rectangle, le carre de l'hypotenuse est egal a la somme des carres des deux autres cotes.",
  },
  en: {
    badge: "Aligned with the French national curriculum",
    navLogin: "Sign in",
    heroTitleLine1: "Your smart",
    heroTitleAccent: "school assistant",
    heroDescription:
      "Sara supports students from middle school through every subject. Review lessons, get homework help, and improve at your own pace.",
    startNow: "Start now",
    featuresTitle: "Everything you need to succeed",
    featuresDescription:
      "Tools designed for students and aligned with official learning goals.",
    features: [
      {
        title: "Revision sheets",
        text: "Clear chapter summaries with examples and common mistakes.",
      },
      {
        title: "Homework support",
        text: "Step-by-step guidance to understand the method, not just the answer.",
      },
      {
        title: "Adaptive exercises",
        text: "Practice generated based on student level and progression.",
      },
      {
        title: "Clear objectives",
        text: "Each concept is broken down into practical and measurable goals.",
      },
    ],
    curriculumTitle: "Built around the French curriculum",
    curriculumDescription:
      "Lessons, exercises, and revision materials are crafted to match official standards.",
    curriculumBullets: [
      "Math, Physics, Biology",
      "French, History and Geography",
      "English, Spanish",
      "Grades equivalent to 6th through 9th",
    ],
    ctaTitle: "Ready to improve?",
    ctaDescription: "Join Sara for free and start learning right away.",
    ctaButton: "Create my account",
    footer: "Sara - Smart learning assistant for students",
    chatUser: "I want to review the Pythagorean theorem.",
    chatSara:
      "Sure. In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides.",
  },
};

const FEATURE_ICONS = [BookOpen, FileText, Brain, Target];
const FEATURE_ICON_COLORS = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-orange-50 text-orange-600",
  "bg-green-50 text-green-600",
];

export default function HomePresentation() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n?.resolvedLanguage?.startsWith("fr") ? "fr" : "en";
  const t = CONTENT[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 text-gray-900">
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#118C44] to-[#0d6e35] rounded-xl flex items-center justify-center shadow-md text-white">
              <GraduationCap size={22} weight="duotone" />
            </div>
            <span className="text-xl font-bold text-[#118C44]">Sara</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i18n.changeLanguage("en")}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                lang === "en"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🇺🇸 EN
            </button>
            <button
              type="button"
              onClick={() => i18n.changeLanguage("fr")}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                lang === "fr"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🇫🇷 FR
            </button>
            <button
              onClick={() => navigate("/sara/login")}
              className="ml-1 px-5 py-2.5 bg-[#118C44] !text-white rounded-lg hover:bg-[#0d6e35] transition-colors font-medium text-sm shadow-md"
            >
              {t.navLogin}
            </button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-[#118C44] font-medium mb-8">
          <GraduationCap size={18} weight="duotone" className="shrink-0" />
          {t.badge}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
          {t.heroTitleLine1}
          <br />
          <span className="text-[#118C44]">{t.heroTitleAccent}</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t.heroDescription}
        </p>
        <button
          onClick={() => navigate("/sara/register")}
          className="px-8 py-4 bg-[#118C44] !text-white rounded-xl hover:bg-[#0d6e35] transition-all font-bold text-lg shadow-lg hover:shadow-xl inline-flex items-center gap-2"
        >
          {t.startNow}
          <ArrowRight size={20} weight="bold" />
        </button>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4">
          {t.featuresTitle}
        </h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
          {t.featuresDescription}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] || BookOpen;
            const iconColors =
              FEATURE_ICON_COLORS[index] || "bg-green-50 text-green-600";
            return (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColors}`}
              >
                <Icon size={24} weight="duotone" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.text}
              </p>
            </div>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#118C44] to-[#0d6e35] py-16">
        <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">
              {t.curriculumTitle}
            </h2>
            <p className="text-green-100 text-lg mb-8 leading-relaxed max-w-3xl">
              {t.curriculumDescription}
            </p>
            <div className="space-y-3">
              {t.curriculumBullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 text-green-50">
                  <CheckCircle size={20} weight="fill" className="text-green-300 shrink-0" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                <GraduationCap size={20} weight="duotone" />
              </div>
              <div>
                <p className="text-white font-semibold leading-none">Sara</p>
                <p className="text-green-200 text-xs mt-1">Assistant IA</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm bg-white/20 text-white">
                  {t.chatUser}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm bg-white/10 text-green-50 border border-white/10">
                  {t.chatSara}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
          {t.ctaTitle}
        </h2>
        <p className="text-gray-500 mb-8 max-w-lg mx-auto">{t.ctaDescription}</p>
        <button
          onClick={() => navigate("/sara/register")}
          className="px-8 py-4 bg-[#118C44] !text-white rounded-xl hover:bg-[#0d6e35] transition-all font-bold text-lg shadow-lg hover:shadow-xl inline-flex items-center gap-2"
        >
          {t.ctaButton}
          <ArrowRight size={20} weight="bold" />
        </button>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center">
        <p className="text-sm text-gray-400">{t.footer}</p>
      </footer>
    </div>
  );
}
