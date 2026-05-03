import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseQuiz } from "./parser";
import QuizScore from "./QuizScore";
import QCM from "./types/QCM";
import VF from "./types/VF";
import QR from "./types/QR";
import Flashcard from "./types/Flashcard";
import QRC from "./types/QRC";
import Trous from "./types/Trous";
import TrousRC from "./types/TrousRC";
import Ordre from "./types/Ordre";
import Association from "./types/Association";
import Correspondance from "./types/Correspondance";
import Etiquettes from "./types/Etiquettes";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import useUser from "@/hooks/useUser";
import { safeJsonParse } from "@/utils/request";

const COMPONENTS = {
  QCM,
  VF,
  QR,
  Flashcard,
  QRC,
  Trous,
  TrousRC,
  Ordre,
  Association,
  Correspondance,
  Etiquettes,
};

const SCORABLE = [
  "QCM",
  "VF",
  "QRC",
  "Trous",
  "TrousRC",
  "Ordre",
  "Association",
  "Correspondance",
  "Etiquettes",
];

const LANG_TO_BCP47 = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
};

export default function QuizBlock({
  content,
  workspace = null,
  activeThread = null,
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { questions, competence, objective } = parseQuiz(content);
  const [answers, setAnswers] = useState({});

  const userLang = (() => {
    try {
      const settings = safeJsonParse(user?.userSettings, {});
      const raw = (settings?.lang || "fr").toString().toLowerCase();
      if (raw.includes("-")) return raw;
      return LANG_TO_BCP47[raw] || "fr-FR";
    } catch {
      return "fr-FR";
    }
  })();

  const total = questions.filter((q) => SCORABLE.includes(q.type)).length;
  const correct = Object.entries(answers).filter(([, v]) => v === true).length;
  const done =
    questions.length > 0 && Object.keys(answers).length === questions.length;

  const handleAnswer = (index, isCorrect) => {
    setAnswers((prev) => {
      const next = { ...prev, [index]: isCorrect };
      if (activeThread?.id && SCORABLE.includes(questions[index]?.type)) {
        fetch(`${API_BASE}/v1/user/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: getDeviceId(),
            userId: user?.id ?? null,
            workspaceId: workspace?.id ?? 0,
            threadId: activeThread?.id ?? 0,
            competence: competence || activeThread?.name || "",
            subchapter: activeThread?.name ?? "",
            statement:
              questions[index]?.question ||
              questions[index]?.front ||
              `Q${index + 1}`,
            response: isCorrect ? "correct" : "incorrect",
            questionType: (questions[index]?.type || "qcm").toLowerCase(),
            isCorrect,
            total: 1,
            correct: isCorrect ? 1 : 0,
            // Si Sara a annoté `objective: <titre>` dans le bloc, on transmet :
            // le serveur l'utilisera directement (sinon embedding sur le statement).
            objectiveTitle: objective || null,
          }),
        })
          .then(() => {
            // Notifie ObjectiveProgress de re-fetch la progression
            window.dispatchEvent(new CustomEvent("sara:exerciseSaved"));
          })
          .catch(() => {});
      }
      return next;
    });
  };

  if (!questions.length) return null;

  return (
    <div className="my-3 rounded-xl border border-emerald-700/20 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.03] light:bg-emerald-50/40 px-2.5 py-2 md:px-3 md:py-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 light:text-slate-500">
          {t("sara.quiz.header")}
        </p>
        {competence && (
          <span className="text-[10px] font-medium text-emerald-400 light:text-emerald-700 bg-emerald-900/20 light:bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-700/30 light:border-emerald-300">
            {competence}
          </span>
        )}
      </div>
      {questions.map((q, i) => {
        const Comp = COMPONENTS[q.type];
        if (!Comp) return null;
        return (
          <Comp
            key={i}
            {...q}
            lang={userLang}
            onAnswer={(isCorrect) => handleAnswer(i, isCorrect)}
            answered={answers[i]}
          />
        );
      })}
      {done && total > 0 && <QuizScore correct={correct} total={total} />}
    </div>
  );
}
