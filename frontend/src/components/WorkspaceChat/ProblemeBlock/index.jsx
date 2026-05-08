import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseProbleme } from "./parser";
import DOMPurify from "@/utils/chat/purify";
import renderMarkdown from "@/utils/chat/markdown";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import useUser from "@/hooks/useUser";

function QuestionOuverte({ question, corrige, index, competence, workspace, activeThread }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [evaluated, setEvaluated] = useState(false);

  const saveResult = (isCorrect) => {
    if (!activeThread?.id) return;
    fetch(`${API_BASE}/v1/user/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        userId: user?.id ?? null,
        workspaceId: workspace?.id ?? 0,
        threadId: activeThread.id,
        competence: competence || activeThread?.name || "",
        subchapter: activeThread?.name ?? "",
        statement: question,
        response: isCorrect ? "correct" : "incorrect",
        questionType: "probleme",
        isCorrect,
        total: 1,
        correct: isCorrect ? 1 : 0,
      }),
    }).catch(() => {});
  };

  const handleEval = (isCorrect) => {
    setEvaluated(true);
    saveResult(isCorrect);
  };

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-white/90 light:text-slate-800 mb-2 leading-snug">{question}</p>

      {!revealed ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("sara.quiz.placeholder_write")}
            rows={3}
            className="w-full rounded-lg bg-zinc-700/60 border border-zinc-600/50 text-white/90 placeholder-zinc-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 light:placeholder-slate-400 text-sm px-3 py-2 resize-y focus:outline-none focus:border-emerald-500/60 light:focus:border-emerald-500"
          />
          <button
            onClick={() => setRevealed(true)}
            className="mt-2 px-4 py-1.5 rounded-lg bg-blue-700/50 hover:bg-blue-700/70 text-blue-200 light:bg-blue-600 light:hover:bg-blue-700 light:text-white text-xs font-semibold transition-colors"
          >
            {t("sara.probleme.validate_see")}
          </button>
        </>
      ) : (
        <>
          {corrige && (
            <div
              className="mt-1 px-3 py-3 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-white/85 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-900 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(renderMarkdown(corrige)),
              }}
            />
          )}

          {!evaluated ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="w-full text-xs text-zinc-400 light:text-slate-500 mb-1">{t("sara.probleme.did_you_know")}</p>
              <button onClick={() => handleEval(true)} className="px-3 py-1.5 rounded-lg bg-emerald-800/50 hover:bg-emerald-700/60 border border-emerald-600/40 text-emerald-300 light:bg-emerald-50 light:hover:bg-emerald-100 light:border-emerald-300 light:text-emerald-700 text-xs font-semibold transition-colors">
                {t("sara.probleme.i_knew")}
              </button>
              <button onClick={() => handleEval(false)} className="px-3 py-1.5 rounded-lg bg-yellow-800/40 hover:bg-yellow-700/50 border border-yellow-600/40 text-yellow-300 light:bg-amber-50 light:hover:bg-amber-100 light:border-amber-300 light:text-amber-700 text-xs font-semibold transition-colors">
                {t("sara.probleme.i_knew_partly")}
              </button>
              <button onClick={() => handleEval(false)} className="px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/50 border border-red-700/40 text-red-300 light:bg-red-50 light:hover:bg-red-100 light:border-red-300 light:text-red-700 text-xs font-semibold transition-colors">
                {t("sara.probleme.i_didnt_know")}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500 light:text-slate-400">{t("sara.probleme.saved")}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function ProblemeBlock({ content, workspace = null, activeThread = null }) {
  const { t } = useTranslation();
  const { titre, niveau, competence, enonce, questions } = parseProbleme(content);

  if (!enonce && !questions.length) return null;

  return (
    <div className="my-4 ml-2 md:ml-4 rounded-2xl overflow-hidden border border-blue-700/40 bg-zinc-900/70 light:bg-white light:border-blue-200 light:shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between px-4 py-2 bg-blue-900/30 border-b border-blue-700/30 light:bg-blue-50 light:border-blue-200">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-300 light:text-blue-700">
          📝 {titre || t("sara.probleme.default_title")}
        </span>
        <div className="flex items-center gap-2">
          {competence && (
            <span className="text-xs text-blue-300/70 bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-700/30 light:text-blue-700 light:bg-white light:border-blue-200">
              {competence}
            </span>
          )}
          {niveau && (
            <span className="text-xs text-blue-400/70 light:text-blue-600/80">{niveau}</span>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {enonce && (
          <div
            className="mb-5 text-sm text-white/85 light:text-slate-700 leading-relaxed border-l-2 border-blue-500/40 light:border-blue-300 pl-3"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderMarkdown(enonce)),
            }}
          />
        )}

        {questions.length > 0 && (
          <div className="border-t border-zinc-700/40 light:border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 light:text-slate-500 mb-4">
              {t("sara.probleme.questions_header")}
            </p>
            {questions.map((q, i) => (
              <QuestionOuverte
                key={i}
                index={i}
                {...q}
                competence={competence}
                workspace={workspace}
                activeThread={activeThread}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
