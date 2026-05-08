import React from "react";
import { Link } from "react-router-dom";
import SaraLogo from "@/media/logo/sara-logo.svg";

/**
 * Minimal layout for the public/student UI. No sidebar, no burger menu.
 * Used by /student, /student/:slug, /student/:slug/t/:threadSlug.
 *
 * Le menu compte (Mon planning / Mes favoris / Mon profil / Sign out) est
 * fourni par le bouton flottant `<UserButton>` injecté par PrivateRoute.
 * On ne dédouble PAS ici (sinon deux SignOut visibles top-right).
 */
export default function StudentLayout({
  title = null,
  backTo = null,
  children,
  fullBleed = false,
}) {
  return (
    <div className="light relative w-screen h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 flex flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-indigo-200/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-sky-200/30 blur-3xl"
        aria-hidden
      />
      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 h-16 bg-white/75 backdrop-blur border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {backTo && (
            <Link
              to={backTo}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-slate-700 text-2xl shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              aria-label="Retour"
            >
              ←
            </Link>
          )}
          <Link
            to="/student"
            className="shrink-0 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-full"
            aria-label="Accueil Sara"
          >
            <img src={SaraLogo} alt="Sara" className="w-6 h-6" />
          </Link>
          {title && (
            <h1 className="text-lg md:text-xl font-semibold text-slate-800 truncate">
              {title}
            </h1>
          )}
        </div>
      </header>
      <main
        className={
          fullBleed
            ? "relative z-10 flex-1 min-h-0 flex flex-col"
            : "relative z-10 flex-1 min-h-0 overflow-y-auto"
        }
      >
        {children}
      </main>
    </div>
  );
}
