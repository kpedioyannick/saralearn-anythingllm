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

const COMPONENTS = {
  QCM, VF, QR, Flashcard, QRC, Trous, TrousRC, Ordre, Association, Correspondance, Etiquettes,
};

const SCORABLE = ["QCM", "VF", "QRC", "Trous", "TrousRC", "Ordre", "Association", "Correspondance", "Etiquettes"];

export default function QuizBlock({ content, workspace = null, activeThread = null }) {
  const { t } = useTranslation();
  const { questions, competence } = parseQuiz(content);
  const [answers, setAnswers] = useState({});

  const total = questions.filter((q) => SCORABLE.includes(q.type)).length;
  const correct = Object.entries(answers).filter(([, v]) => v === true).length;
  const done = questions.length > 0 && Object.keys(answers).length === questions.length;

  const handleAnswer = (index, isCorrect) => {
    setAnswers((prev) => {
      const next = { ...prev, [index]: isCorrect };
      if (activeThread?.id && SCORABLE.includes(questions[index]?.type)) {
        fetch(`${API_BASE}/v1/user/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: getDeviceId(),
            workspaceId: workspace?.id ?? 0,
            threadId: activeThread?.id ?? 0,
            competence: competence || activeThread?.name || "",
            subchapter: activeThread?.name ?? "",
            statement: questions[index]?.question || questions[index]?.front || `Q${index + 1}`,
            response: isCorrect ? "correct" : "incorrect",
            questionType: (questions[index]?.type || "qcm").toLowerCase(),
            isCorrect,
            total: 1,
            correct: isCorrect ? 1 : 0,
          }),
        }).catch(() => {});
      }
      return next;
    });
  };

  if (!questions.length) return null;

  return (
    <div className="my-4 ml-2 md:ml-4 rounded-2xl overflow-hidden border border-emerald-700/40 bg-zinc-900/60 dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("sara.quiz.header")}</p>
        {competence && (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-700/40">
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
            onAnswer={(isCorrect) => handleAnswer(i, isCorrect)}
            answered={answers[i]}
          />
        );
      })}
      {done && total > 0 && <QuizScore correct={correct} total={total} />}
    </div>
  );
}
