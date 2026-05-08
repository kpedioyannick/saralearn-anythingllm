import React, { useState, useEffect, useRef } from "react";
import { AUTH_TOKEN, AUTH_USER, API_BASE } from "@/utils/constants";
import paths from "@/utils/paths";
import SaraLogo from "@/media/logo/sara-logo.svg";
import {
  Brain,
  BookOpen,
  PencilLine,
  Sparkle,
  CheckCircle,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

const LOGIN_CARD_PHRASES = {
  fr: [
    "fiches de revision",
    "quiz pour te tester",
    "exercices d'entrainement",
    "defis pour te challenger",
    "travail en autonomie",
  ],
  en: [
    "study summaries",
    "quizzes to assess yourself",
    "practice exercises",
    "challenges to push yourself",
    "self-paced learning",
  ],
};

const LOGIN_COPY = {
  fr: {
    studentSpace: "Espace eleve",
    title: "Connexion a Sara",
    description:
      "Une plateforme moderne pour apprendre en autonomie, reviser, t'entrainer et te challenger avec l'IA.",
    aiFor: "IA pour",
    username: "Pseudo",
    usernamePlaceholder: "Entre ton pseudo",
    password: "Mot de passe",
    passwordPlaceholder: "Entre ton mot de passe",
    loginLoading: "Connexion...",
    login: "Se connecter",
    register: "Pas encore inscrit ? Creer un compte",
    networkError: "Erreur reseau",
    invalidCredentials: "Identifiants incorrects.",
    brandTag: "IA educative personnalisee",
    brandLine1: "Ton copilote pour",
    brandLine2: "apprendre, reviser et progresser",
    point1: "Apprentissage autonome et guide pas a pas",
    point2: "Fiches de revision claires et adaptees a ton niveau",
    point3: "Exercices corriges pour progresser plus vite",
    panelFooter:
      "Plus de 1000 parcours d'apprentissage inspires des programmes scolaires.",
  },
  en: {
    studentSpace: "Student Space",
    title: "Sign in to Sara",
    description:
      "A modern platform to learn independently, review, practice and challenge yourself with AI.",
    aiFor: "AI for",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    loginLoading: "Signing in...",
    login: "Sign in",
    register: "Not registered yet? Create an account",
    networkError: "Network error",
    invalidCredentials: "Invalid credentials.",
    brandTag: "Personalized educational AI",
    brandLine1: "Your copilot to",
    brandLine2: "learn, review and improve",
    point1: "Self-paced learning with step-by-step guidance",
    point2: "Clear revision sheets adapted to your level",
    point3: "Corrected exercises to progress faster",
    panelFooter:
      "More than 1000 learning paths inspired by school curricula.",
  },
};

function useTypewriter(phrases) {
  const [displayed, setDisplayed] = useState("");
  const [cursor, setCursor] = useState(true);
  const idx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);
  const pause = useRef(false);

  useEffect(() => {
    const cursorTimer = setInterval(() => setCursor((c) => !c), 500);
    return () => clearInterval(cursorTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (pause.current) {
        pause.current = false;
        deleting.current = true;
        return;
      }
      const phrase = phrases[idx.current];
      if (!deleting.current) {
        charIdx.current++;
        setDisplayed(phrase.slice(0, charIdx.current));
        if (charIdx.current === phrase.length) pause.current = true;
      } else {
        charIdx.current--;
        setDisplayed(phrase.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          idx.current = (idx.current + 1) % phrases.length;
        }
      }
    }, deleting.current ? 320 : 480);
    return () => clearInterval(timer);
  }, [phrases]);

  return displayed + (cursor ? "|" : "\u00a0");
}

function BrandingPanel({ copy }) {
  return (
    <div
      className="relative hidden lg:flex w-1/2 flex-col items-center justify-center px-12 text-white overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, rgba(74, 222, 128, 0.28), transparent 38%), radial-gradient(circle at 80% 90%, rgba(29, 78, 216, 0.22), transparent 42%), linear-gradient(160deg, #0f172a 0%, #052e16 50%, #14532d 100%)",
      }}
    >
      <div className="absolute -top-16 -left-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute bottom-10 -right-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative z-10 max-w-lg">
        <img src={SaraLogo} alt="Sara" className="h-16 mb-8 brightness-0 invert" />
        <div
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur"
          style={{ color: "#ffffff" }}
        >
          <Sparkle size={14} weight="fill" style={{ color: "#ffffff" }} />
          {copy.brandTag}
        </div>
        <p className="mt-6 text-3xl font-light leading-tight" style={{ color: "#ffffff" }}>
          {copy.brandLine1}
        </p>
        <p className="text-3xl font-bold min-h-[2.5rem]" style={{ color: "#ffffff" }}>
          {copy.brandLine2}
        </p>
        <ul className="mt-8 space-y-4 text-lg text-white/95">
          <li className="flex items-center gap-4">
            <Brain size={26} weight="duotone" className="text-emerald-200 shrink-0" />
            <span>{copy.point1}</span>
          </li>
          <li className="flex items-center gap-4">
            <BookOpen size={26} weight="duotone" className="text-emerald-200 shrink-0" />
            <span>{copy.point2}</span>
          </li>
          <li className="flex items-center gap-4">
            <PencilLine size={26} weight="duotone" className="text-emerald-200 shrink-0" />
            <span>{copy.point3}</span>
          </li>
        </ul>
        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-sm text-white/90">
            {copy.panelFooter}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SaraLogin() {
  const { i18n } = useTranslation();
  const uiLang = i18n?.resolvedLanguage?.startsWith("fr") ? "fr" : "en";
  const copy = LOGIN_COPY[uiLang];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loginCardTyped = useTypewriter(LOGIN_CARD_PHRASES[uiLang]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.target);
    const res = await fetch(`${API_BASE}/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    })
      .then((r) => r.json())
      .catch(() => ({ valid: false, message: copy.networkError }));

    if (res.valid && res.token) {
      if (res.user) {
        window.localStorage.setItem(AUTH_USER, JSON.stringify(res.user));
        try {
          const settings = JSON.parse(res.user.userSettings || "{}");
          if (settings.lang) i18n.changeLanguage(settings.lang);
        } catch {}
      }
      window.localStorage.setItem(AUTH_TOKEN, res.token);
      const isAdmin = res.user?.role === "admin" || res.user?.role === "manager";
      window.location = isAdmin ? paths.home() : paths.student.home();
    } else {
      setError(copy.invalidCredentials);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        background:
          "radial-gradient(circle at 10% 10%, rgba(16, 185, 129, 0.14), transparent 30%), radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.12), transparent 32%), #f8fafc",
      }}
    >
      <div className="flex w-full flex-col justify-center px-4 py-8 sm:px-8 lg:w-1/2 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-200/70 backdrop-blur sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <img src={SaraLogo} alt="Sara" className="h-9 sm:h-10" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i18n.changeLanguage("en")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  uiLang === "en"
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
                  uiLang === "fr"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🇫🇷 FR
              </button>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {copy.studentSpace}
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {copy.description}
          </p>
          <p className="mt-3 text-sm font-semibold text-emerald-700 sm:text-base">
            {copy.aiFor} {loginCardTyped}
          </p>
          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
            <label className="text-sm font-semibold text-slate-700" htmlFor="sara-login-username">
              {copy.username}
            </label>
            <input
              id="sara-login-username"
              name="username"
              type="text"
              placeholder={copy.usernamePlaceholder}
              required
              autoComplete="username"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <label className="text-sm font-semibold text-slate-700" htmlFor="sara-login-password">
              {copy.password}
            </label>
            <input
              id="sara-login-password"
              name="password"
              type="password"
              placeholder={copy.passwordPlaceholder}
              required
              autoComplete="current-password"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? copy.loginLoading : copy.login}
            </button>
            <a
              href={paths.sara.register()}
              className="text-center text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
            >
              {copy.register}
            </a>
          </form>
        </div>
      </div>
      <BrandingPanel copy={copy} />
    </div>
  );
}
