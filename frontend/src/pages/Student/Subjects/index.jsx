import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Workspace from "@/models/workspace";
import StudentLayout from "@/components/StudentLayout";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";

const SUBJECT_PALETTE = [
  { from: "from-rose-100", to: "to-rose-50", text: "text-rose-700", emoji: "📚" },
  { from: "from-sky-100", to: "to-sky-50", text: "text-sky-700", emoji: "📐" },
  { from: "from-emerald-100", to: "to-emerald-50", text: "text-emerald-700", emoji: "🧪" },
  { from: "from-amber-100", to: "to-amber-50", text: "text-amber-700", emoji: "🌍" },
  { from: "from-violet-100", to: "to-violet-50", text: "text-violet-700", emoji: "🇬🇧" },
  { from: "from-cyan-100", to: "to-cyan-50", text: "text-cyan-700", emoji: "🎨" },
];

const SUBJECT_EMOJI = {
  math: "📐",
  maths: "📐",
  francais: "📚",
  français: "📚",
  histoire: "🌍",
  geographie: "🌍",
  géographie: "🌍",
  svt: "🧪",
  sciences: "🧪",
  physique: "⚛️",
  chimie: "⚗️",
  anglais: "🇬🇧",
  english: "🇬🇧",
  espagnol: "🇪🇸",
  arts: "🎨",
  musique: "🎵",
  technologie: "💻",
  philosophie: "💭",
  emc: "⚖️",
};

function pickEmojiFromName(name = "") {
  const lc = name.toLowerCase();
  for (const key in SUBJECT_EMOJI) {
    if (lc.includes(key)) return SUBJECT_EMOJI[key];
  }
  return null;
}

function paletteFor(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

export default function StudentSubjects() {
  const [workspaces, setWorkspaces] = useState(null);

  useEffect(() => {
    Workspace.all().then((all) => setWorkspaces(all || []));
  }, []);

  if (workspaces === null) return <FullScreenLoader />;

  return (
    <StudentLayout title="Choisis ta matière">
      <div className="px-4 md:px-[50px] py-6 w-full">
        {workspaces.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white/80 shadow-sm text-center text-slate-500 py-16 px-6">
            <p className="text-3xl mb-3" aria-hidden>
              📭
            </p>
            <p className="font-medium">
              Aucune matiere n&apos;est encore disponible.
            </p>
            <p className="text-sm mt-1">Demande a ton professeur.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {workspaces.map((w) => {
              const palette = paletteFor(w.slug);
              const emoji = pickEmojiFromName(w.name) || palette.emoji;
              return (
                <Link
                  key={w.slug}
                  to={paths.student.subject(w.slug)}
                  className={`group relative overflow-hidden flex flex-col items-center justify-center aspect-square rounded-3xl bg-gradient-to-br ${palette.from} ${palette.to} border border-white/90 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-indigo-200 active:scale-[0.98] transition-all duration-200 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300`}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-white/20 to-transparent" />
                  <span
                    className="relative z-[1] flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/80 border border-white/70 shadow-sm text-4xl md:text-5xl mb-3"
                    aria-hidden
                  >
                    {emoji}
                  </span>
                  <span
                    className={`relative z-[1] text-center font-semibold text-base md:text-lg ${palette.text} line-clamp-2`}
                  >
                    {w.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
