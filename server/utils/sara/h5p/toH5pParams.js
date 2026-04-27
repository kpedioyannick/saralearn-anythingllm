/**
 * Convertit un objet question text2quiz en { type, params } pour l'API H5P PHP.
 *   QCM  → H5P.MultiChoice 1.16  (type API: multiple_choice)
 *   VF   → H5P.TrueFalse 1.8     (type API: true_false_question)
 *   QRC  → H5P.Blanks 1.14       (type API: fill_in_the_blanks)
 *
 * Localization : 2 langues (fr/en) — passées en argument lang depuis le caller
 * (resolved via getUserLanguage(user) en amont).
 *
 * Dédup answers : QCM peut recevoir des doublons hallucinés par le LLM (ex. même
 * texte avec correct=true ET correct=false). dedupAnswers() collapse par texte
 * normalisé en gardant la version correcte si elle existe.
 */

// -- localization ------------------------------------------------------------

const L10N = {
  fr: {
    confirmCheck: {
      header: "Terminer ?",
      body: "Es-tu sûr de vouloir terminer ?",
      cancelLabel: "Annuler",
      confirmLabel: "Terminer",
    },
    confirmRetry: {
      header: "Recommencer ?",
      body: "Es-tu sûr de vouloir recommencer ?",
      cancelLabel: "Annuler",
      confirmLabel: "Confirmer",
    },
    qcmUI: {
      checkAnswerButton: "Vérifier",
      showSolutionButton: "Voir la solution",
      tryAgainButton: "Recommencer",
      tipsLabel: "Indice",
      scoreBarLabel: "Score : @score sur @total",
      tipAvailable: "Indice disponible",
      feedbackAvailable: "Feedback disponible",
      readFeedback: "Lire le feedback",
      wrongAnswer: "Mauvaise réponse",
      correctAnswer: "Bonne réponse",
      shouldCheck: "Aurait dû être sélectionné",
      shouldNotCheck: "N'aurait pas dû être sélectionné",
      noInput: "Veuillez répondre avant de vérifier",
    },
    vfL10n: {
      trueText: "Vrai",
      falseText: "Faux",
      score: "Score : @score sur @total",
      checkAnswer: "Vérifier",
      submitAnswer: "Valider",
      showSolutionButton: "Voir la solution",
      tryAgain: "Recommencer",
      wrongAnswerMessage: "Mauvaise réponse",
      correctAnswerMessage: "Bonne réponse",
      scoreBarLabel: "Score",
      a11yCheck: "Vérifier",
      a11yShowSolution: "Voir la solution",
      a11yRetry: "Recommencer",
    },
    qrcL10n: {
      text: "<p>Complète la réponse :</p>",
      showSolutions: "Voir la solution",
      tryAgain: "Recommencer",
      checkAnswer: "Vérifier",
      submitAnswer: "Valider",
      notFilledOut: "Veuillez remplir la réponse",
      answerIsCorrect: "Bonne réponse !",
      answerIsWrong: "Mauvaise réponse",
      answeredCorrectly: "Répondu correctement",
      answeredIncorrectly: "Répondu incorrectement",
      solutionLabel: "Solution :",
      inputLabel: "Champ @num sur @total",
      inputHasTipLabel: "Indice disponible",
      tipLabel: "Indice",
      scoreBarLabel: "Score : @score sur @total",
      a11yCheck: "Vérifier",
      a11yShowSolution: "Voir la solution",
      a11yRetry: "Recommencer",
      a11yCheckingModeHeader: "Mode de correction",
    },
  },
  en: {
    confirmCheck: {
      header: "Finish?",
      body: "Are you sure you want to finish?",
      cancelLabel: "Cancel",
      confirmLabel: "Finish",
    },
    confirmRetry: {
      header: "Retry?",
      body: "Are you sure you want to retry?",
      cancelLabel: "Cancel",
      confirmLabel: "Confirm",
    },
    qcmUI: {
      checkAnswerButton: "Check",
      showSolutionButton: "Show solution",
      tryAgainButton: "Retry",
      tipsLabel: "Tip",
      scoreBarLabel: "Score: @score out of @total",
      tipAvailable: "Tip available",
      feedbackAvailable: "Feedback available",
      readFeedback: "Read feedback",
      wrongAnswer: "Wrong answer",
      correctAnswer: "Correct answer",
      shouldCheck: "Should have been checked",
      shouldNotCheck: "Should not have been checked",
      noInput: "Please answer before checking",
    },
    vfL10n: {
      trueText: "True",
      falseText: "False",
      score: "Score: @score out of @total",
      checkAnswer: "Check",
      submitAnswer: "Submit",
      showSolutionButton: "Show solution",
      tryAgain: "Retry",
      wrongAnswerMessage: "Wrong answer",
      correctAnswerMessage: "Correct answer",
      scoreBarLabel: "Score",
      a11yCheck: "Check",
      a11yShowSolution: "Show solution",
      a11yRetry: "Retry",
    },
    qrcL10n: {
      text: "<p>Fill in the answer:</p>",
      showSolutions: "Show solution",
      tryAgain: "Retry",
      checkAnswer: "Check",
      submitAnswer: "Submit",
      notFilledOut: "Please fill in the answer",
      answerIsCorrect: "Correct answer!",
      answerIsWrong: "Wrong answer",
      answeredCorrectly: "Answered correctly",
      answeredIncorrectly: "Answered incorrectly",
      solutionLabel: "Solution:",
      inputLabel: "Field @num of @total",
      inputHasTipLabel: "Tip available",
      tipLabel: "Tip",
      scoreBarLabel: "Score: @score out of @total",
      a11yCheck: "Check",
      a11yShowSolution: "Show solution",
      a11yRetry: "Retry",
      a11yCheckingModeHeader: "Checking mode",
    },
  },
};

const OVERALL_FEEDBACK = [{ from: 0, to: 100 }];

function pickLang(lang) {
  return L10N[lang] ? lang : "fr";
}

// -- helpers -----------------------------------------------------------------

function htmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toP(s) {
  return `<p>${htmlEscape(s)}</p>`;
}

function toDiv(s) {
  return `<div>${htmlEscape(s)}</div>`;
}

// Dedup QCM answers by normalized text. Keep the entry marked correct if any
// duplicate group contains one. Promotes correctness if the duplicate is the
// canonical correct answer (LLM hallucination: same text appears as both
// correct=true and correct=false → keep one and mark it correct).
function dedupAnswers(answers) {
  const seen = new Map();
  for (const a of answers || []) {
    const key = String(a?.text ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.,;:!?'"]/g, "")
      .trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, { ...a });
    } else if (a.correct) {
      seen.get(key).correct = true;
    }
  }
  return [...seen.values()];
}

// -- QCM → MultiChoice -------------------------------------------------------

function qcmToMultiChoice(q, lang = "fr") {
  if (!q || q.type !== "QCM" || !Array.isArray(q.answers) || q.answers.length === 0) {
    throw new Error("qcmToMultiChoice: question QCM invalide");
  }
  const t = L10N[pickLang(lang)];
  const answers = dedupAnswers(q.answers);
  if (answers.length === 0) throw new Error("qcmToMultiChoice: 0 answer after dedup");
  return {
    type: "multiple_choice",
    params: {
      media: { disableImageZooming: false },
      question: toP(q.question),
      answers: answers.map((a) => ({
        text: toDiv(a.text),
        correct: !!a.correct,
        tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" },
      })),
      overallFeedback: OVERALL_FEEDBACK,
      UI: t.qcmUI,
      confirmCheck: t.confirmCheck,
      confirmRetry: t.confirmRetry,
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        type: "auto",
        singlePoint: false,
        randomAnswers: true,
        showSolutionsRequiresInput: true,
        confirmCheckDialog: false,
        confirmRetryDialog: false,
        autoCheck: false,
        passPercentage: 100,
        showScorePoints: true,
      },
    },
  };
}

// -- VF → TrueFalse ----------------------------------------------------------

function vfToTrueFalse(q, lang = "fr") {
  if (!q || q.type !== "VF" || typeof q.correct !== "boolean") {
    throw new Error("vfToTrueFalse: question VF invalide");
  }
  const t = L10N[pickLang(lang)];
  return {
    type: "true_false_question",
    params: {
      media: { disableImageZooming: true },
      question: toP(q.question),
      correct: q.correct ? "true" : "false",
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        autoCheck: false,
        confirmCheckDialog: false,
        confirmRetryDialog: false,
      },
      l10n: t.vfL10n,
      confirmCheck: t.confirmCheck,
      confirmRetry: t.confirmRetry,
    },
  };
}

// -- QRC → Blanks ------------------------------------------------------------

// Blanks utilise la syntaxe *réponse:indice* dans le texte de la question.
function qrcToBlanks(q, lang = "fr") {
  if (!q || q.type !== "QRC" || !q.answer) {
    throw new Error("qrcToBlanks: question QRC invalide");
  }
  const t = L10N[pickLang(lang)];
  const answer = String(q.answer).replace(/\*/g, "").trim();
  const tip = q.explication ? String(q.explication).replace(/\*/g, "").trim() : "";
  const questionLine = tip
    ? `<p>${htmlEscape(q.question)} *${answer}:${tip}*</p>`
    : `<p>${htmlEscape(q.question)} *${answer}*</p>`;

  return {
    type: "fill_in_the_blanks",
    params: {
      media: { disableImageZooming: false },
      text: t.qrcL10n.text,
      questions: [questionLine],
      overallFeedback: OVERALL_FEEDBACK,
      showSolutions: t.qrcL10n.showSolutions,
      tryAgain: t.qrcL10n.tryAgain,
      checkAnswer: t.qrcL10n.checkAnswer,
      submitAnswer: t.qrcL10n.submitAnswer,
      notFilledOut: t.qrcL10n.notFilledOut,
      answerIsCorrect: t.qrcL10n.answerIsCorrect,
      answerIsWrong: t.qrcL10n.answerIsWrong,
      answeredCorrectly: t.qrcL10n.answeredCorrectly,
      answeredIncorrectly: t.qrcL10n.answeredIncorrectly,
      solutionLabel: t.qrcL10n.solutionLabel,
      inputLabel: t.qrcL10n.inputLabel,
      inputHasTipLabel: t.qrcL10n.inputHasTipLabel,
      tipLabel: t.qrcL10n.tipLabel,
      scoreBarLabel: t.qrcL10n.scoreBarLabel,
      a11yCheck: t.qrcL10n.a11yCheck,
      a11yShowSolution: t.qrcL10n.a11yShowSolution,
      a11yRetry: t.qrcL10n.a11yRetry,
      a11yCheckingModeHeader: t.qrcL10n.a11yCheckingModeHeader,
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        autoCheck: false,
        caseSensitive: false,
        showSolutionsRequiresInput: true,
        separateLines: false,
        confirmCheckDialog: false,
        confirmRetryDialog: false,
        acceptSpellingErrors: false,
      },
      confirmCheck: t.confirmCheck,
      confirmRetry: t.confirmRetry,
    },
  };
}

// -- router ------------------------------------------------------------------

function toH5pPayload(q, lang = "fr") {
  if (q.type === "QCM") return qcmToMultiChoice(q, lang);
  if (q.type === "VF") return vfToTrueFalse(q, lang);
  if (q.type === "QRC") return qrcToBlanks(q, lang);
  throw new Error(`toH5pPayload: type non supporté: ${q.type}`);
}

module.exports = {
  toH5pPayload,
  qcmToMultiChoice,
  vfToTrueFalse,
  qrcToBlanks,
  dedupAnswers,
};
