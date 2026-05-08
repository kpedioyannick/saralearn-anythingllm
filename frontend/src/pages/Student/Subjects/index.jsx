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
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        {workspaces.length === 0 ? (
          <p className="text-center text-slate-500 py-16">
            Aucune matière n'est encore disponible. Demande à ton professeur.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {workspaces.map((w) => {
              const palette = paletteFor(w.slug);
              const emoji = pickEmojiFromName(w.name) || palette.emoji;
              return (
                <Link
                  key={w.slug}
                  to={paths.student.subject(w.slug)}
                  className={`group flex flex-col items-center justify-center aspect-square rounded-2xl bg-gradient-to-br ${palette.from} ${palette.to} border border-white shadow-sm hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all p-4`}
                >
                  <span className="text-5xl md:text-6xl mb-3" aria-hidden>
                    {emoji}
                  </span>
                  <span
                    className={`text-center font-semibold text-base md:text-lg ${palette.text} line-clamp-2`}
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
