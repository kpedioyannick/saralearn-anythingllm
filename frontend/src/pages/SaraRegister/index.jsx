import React, { useState, useEffect, useRef } from "react";
import { AUTH_TOKEN, AUTH_USER, API_BASE } from "@/utils/constants";
import paths from "@/utils/paths";
import SaraLogo from "@/media/logo/sara-logo.svg";
import {
  Brain,
  BookOpen,
  PencilLine,
  Sparkle,
} from "@phosphor-icons/react";

const CLASS_LABELS = {
  cm2: "CM2",
  "6eme": "6ème",
  "5eme": "5ème",
  "4eme": "4ème",
  "3eme": "3ème",
  "2nde": "2nde",
  grade6: "Grade 6",
  grade7: "Grade 7",
  grade8: "Grade 8",
  grade9: "Grade 9",
  grade10: "Grade 10",
};

const PHRASES_FR = [
  "fiches de revision",
  "quiz pour te tester",
  "exercices d'entrainement",
  "defis pour te challenger",
  "travail en autonomie",
];

const PHRASES_EN = [
  "study guides",
  "practice quizzes",
  "step-by-step exercises",
  "personalized challenges",
  "autonomous learning",
];

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
    idx.current = 0;
    charIdx.current = 0;
    deleting.current = false;
    pause.current = false;
    setDisplayed("");
  }, [phrases]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (pause.current) { pause.current = false; deleting.current = true; return; }
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

function BrandingPanel({ lang }) {
  const isFr = lang === "fr";
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
        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur" style={{ color: "#ffffff" }}>
          <Sparkle size={14} weight="fill" style={{ color: "#ffffff" }} />
          {isFr ? "IA educative personnalisee" : "Personalized AI tutor"}
        </div>
        <p className="mt-6 text-3xl font-light leading-tight" style={{ color: "#ffffff" }}>
          {isFr ? "Ton copilote pour" : "Your AI copilot to"}
        </p>
        <p className="text-3xl font-bold min-h-[2.5rem]" style={{ color: "#ffffff" }}>
          {isFr ? "apprendre, reviser et progresser" : "learn, practice and succeed"}
        </p>
        <ul className="mt-8 space-y-4 text-lg text-white/95">
          <li className="flex items-center gap-4">
            <Brain size={26} weight="duotone" className="text-emerald-200 shrink-0" />
            <span>{isFr ? "Apprentissage autonome et guide pas a pas" : "Self-paced learning with step-by-step guidance"}</span>
          </li>
          <li className="flex items-center gap-4">
            <BookOpen size={26} weight="duotone" className="text-emerald-200 shrink-0" />
            <span>{isFr ? "Fiches de revision claires et adaptees a ton niveau" : "Clear study guides tailored to your grade level"}</span>
          </li>
          <li className="flex items-center gap-4">
            <PencilLine size={26} weight="duotone" className="text-emerald-200 shrink-0" />
            <span>{isFr ? "Exercices corriges pour progresser plus vite" : "Solved exercises to help you improve faster"}</span>
          </li>
        </ul>
        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-sm text-white/90">
            {isFr
              ? "Plus de 1000 parcours d'apprentissage inspires des programmes scolaires."
              : "1000+ learning paths aligned with K-12 academic standards."}
          </p>
        </div>
      </div>
    </div>
  );
}

const selectCls = "rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const labelCls  = "text-sm font-semibold text-slate-700";

export default function SaraRegister() {
  const [configData, setConfigData] = useState(null);
  const [lang, setLang]     = useState("fr");
  const [program, setProgram] = useState("");
  const [classe, setClasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const phrases = lang === "en" ? PHRASES_EN : PHRASES_FR;
  const typed   = useTypewriter(phrases);

  useEffect(() => {
    fetch(`${API_BASE}/sara/config`)
      .then((r) => r.json())
      .then((data) => {
        setConfigData(data);
        const defaultLang = data.lang || "fr";
        setLang(defaultLang);
        const defaultProg = (data.programs || []).find(p => p.lang === defaultLang)?.value
          || data.program || "";
        setProgram(defaultProg);
      })
      .catch(() => {});
  }, []);

  // When lang changes, auto-select first matching program
  useEffect(() => {
    if (!configData) return;
    const match = (configData.programs || []).find(p => p.lang === lang);
    if (match) setProgram(match.value);
    setClasse("");
  }, [lang]);

  // When program changes, reset classe
  useEffect(() => { setClasse(""); }, [program]);

  const langs    = configData?.langs    || [];
  const programs = (configData?.programs || []).filter(p => p.lang === lang);
  const classes  = program
    ? (configData?.program_config?.[program]?.classes || [])
    : (configData?.classes || []);

  const isFr = lang === "fr";

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.target);
    const res = await fetch(`${API_BASE}/sara/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        classe,
        lang,
        program,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({ token: null, error: isFr ? "Erreur réseau" : "Network error" }));

    if (res.token && res.user) {
      window.localStorage.setItem(AUTH_USER, JSON.stringify(res.user));
      window.localStorage.setItem(AUTH_TOKEN, res.token);
      window.location = paths.home();
    } else {
      setError(res.error || (isFr ? "Erreur lors de l'inscription." : "Registration failed."));
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
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {isFr ? "Espace élève" : "Student area"}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {isFr ? "Inscription à Sara" : "Sign up for Sara"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {isFr
              ? "Une plateforme moderne pour apprendre en autonomie, réviser, t'entraîner et te challenger avec l'IA."
              : "A modern platform to learn independently, review, practice and challenge yourself with AI."}
          </p>
          <p className="mt-3 text-sm font-semibold text-emerald-700 sm:text-base">
            {isFr ? "IA pour " : "AI for "}{typed}
          </p>

          <form onSubmit={handleRegister} className="mt-6 flex flex-col gap-4">
            {/* Language select — hidden if only one */}
            {langs.length > 1 && (
              <>
                <label className={labelCls}>{isFr ? "Langue" : "Language"}</label>
                <select value={lang} onChange={e => setLang(e.target.value)} className={selectCls}>
                  {langs.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </>
            )}

            {/* Program select — hidden if only one program for this lang */}
            {programs.length > 1 && (
              <>
                <label className={labelCls}>{isFr ? "Programme" : "Curriculum"}</label>
                <select value={program} onChange={e => setProgram(e.target.value)} className={selectCls}>
                  {programs.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </>
            )}

            <label className={labelCls} htmlFor="sara-register-username">
              {isFr ? "Pseudo" : "Username"}
            </label>
            <input
              id="sara-register-username"
              name="username"
              type="text"
              placeholder={isFr ? "Entre ton pseudo" : "Choose a username"}
              required
              autoComplete="username"
              className={selectCls}
            />

            <label className={labelCls} htmlFor="sara-register-password">
              {isFr ? "Mot de passe" : "Password"}
            </label>
            <input
              id="sara-register-password"
              name="password"
              type="password"
              placeholder={isFr ? "Entre ton mot de passe" : "Choose a password"}
              required
              autoComplete="new-password"
              className={selectCls}
            />

            <label className={labelCls} htmlFor="sara-register-class">
              {isFr ? "Classe" : "Grade"}
            </label>
            <select
              id="sara-register-class"
              value={classe}
              onChange={e => setClasse(e.target.value)}
              required
              className={selectCls}
            >
              <option value="">{isFr ? "-- Choisir ta classe --" : "-- Select your grade --"}</option>
              {classes.map((c) => (
                <option key={c} value={c}>{CLASS_LABELS[c] || c}</option>
              ))}
            </select>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? (isFr ? "Inscription..." : "Signing up...")
                : (isFr ? "S'inscrire" : "Sign up")}
            </button>
            <a
              href={paths.sara.login()}
              className="text-center text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
            >
              {isFr ? "Déjà inscrit ? Se connecter" : "Already registered? Log in"}
            </a>
          </form>
        </div>
      </div>
      <BrandingPanel lang={lang} />
    </div>
  );
}
