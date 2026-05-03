import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  X,
  Scales,
  FileText,
  ShieldCheck,
  Cookie,
  Baby,
  ArrowSquareOut,
} from "@phosphor-icons/react";

const SHEET_ANIM_MS = 280;

const DOCS = [
  {
    href: "/legal/mentions-legales.html",
    title: "Mentions légales",
    desc: "Éditeur, hébergeur, contact",
    Icon: FileText,
  },
  {
    href: "/legal/cgu.html",
    title: "Conditions générales d'utilisation",
    desc: "Règles d'usage de Sara AI",
    Icon: Scales,
  },
  {
    href: "/legal/privacy.html",
    title: "Politique de confidentialité",
    desc: "Protection des données (RGPD)",
    Icon: ShieldCheck,
  },
  {
    href: "/legal/cookies.html",
    title: "Politique de cookies",
    desc: "Cookies et traceurs",
    Icon: Cookie,
  },
  {
    href: "/legal/children.html",
    title: "Charte protection des mineurs",
    desc: "RGPD-K, consentement parental",
    Icon: Baby,
  },
];

function isInCapacitorApp() {
  return typeof window !== "undefined" &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform();
}

export default function LegalModal({ onClose }) {
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose?.(), SHEET_ANIM_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const handleDocClick = (e, href) => {
    if (isInCapacitorApp()) {
      e.preventDefault();
      window.location.href = href;
    }
  };

  const visible = entered && !closing;

  const modal = (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 z-10 flex h-full w-[90%] max-w-[560px] flex-col overflow-hidden border-l border-zinc-600/40 bg-zinc-900/98 shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/5 transform transition-transform duration-300 ease-out light:bg-white light:shadow-zinc-900/10 ${visible ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-600/30 bg-zinc-800/30 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5 light:border-zinc-200/80 light:bg-zinc-50/80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="text-balance text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl light:text-zinc-900"
                id="legal-modal-title"
              >
                Informations légales
              </h2>
              <p className="mt-0.5 text-pretty text-xs text-zinc-400 sm:text-sm light:text-zinc-600">
                Documents régissant l'utilisation de Sara AI.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Fermer"
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700/40 hover:text-zinc-100 light:text-zinc-500 light:hover:bg-zinc-200/60 light:hover:text-zinc-900"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 sm:p-4">
          {DOCS.map(({ href, title, desc, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleDocClick(e, href)}
                className="group flex items-start gap-3 rounded-xl border border-transparent bg-zinc-800/40 p-3 transition-all hover:border-emerald-500/40 hover:bg-zinc-800/70 sm:p-4 light:bg-zinc-50 light:hover:border-emerald-500/60 light:hover:bg-emerald-50/40"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 light:bg-emerald-500/10 light:text-emerald-700">
                  <Icon size={20} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-zinc-100 sm:text-base light:text-zinc-900">
                      {title}
                    </span>
                    <ArrowSquareOut
                      size={14}
                      weight="bold"
                      className="shrink-0 text-zinc-500 transition-colors group-hover:text-emerald-400 light:text-zinc-400 light:group-hover:text-emerald-700"
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-400 sm:text-sm light:text-zinc-600">
                    {desc}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-zinc-600/30 bg-zinc-800/30 px-4 py-3 text-center text-xs text-zinc-400 sm:px-5 sm:text-sm light:border-zinc-200/80 light:bg-zinc-50/80 light:text-zinc-600">
          Sara AI © 2026 — Plateforme éducative
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
