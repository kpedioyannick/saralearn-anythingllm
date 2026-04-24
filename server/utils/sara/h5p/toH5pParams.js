/**
 * Convertit un objet question text2quiz en { type, params } pour l'API H5P PHP.
 *   QCM  → H5P.MultiChoice 1.16  (type API: multiple_choice)
 *   VF   → H5P.TrueFalse 1.8     (type API: true_false_question)
 *   QRC  → H5P.Blanks 1.14       (type API: fill_in_the_blanks)
 * Les strings UI/l10n/a11y sont hardcodées en français (valeurs stables, peuvent changer
 * ici sans re-prompter le LLM).
 */

// -- localization sets, partagés ---------------------------------------------

const CONFIRM_CHECK = {
  header: "Terminer ?",
  body: "Es-tu sûr de vouloir terminer ?",
  cancelLabel: "Annuler",
  confirmLabel: "Terminer",
};
const CONFIRM_RETRY = {
  header: "Recommencer ?",
  body: "Es-tu sûr de vouloir recommencer ?",
  cancelLabel: "Annuler",
  confirmLabel: "Confirmer",
};
const OVERALL_FEEDBACK = [{ from: 0, to: 100 }];

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

// -- QCM → MultiChoice -------------------------------------------------------

function qcmToMultiChoice(q) {
  if (!q || q.type !== "QCM" || !Array.isArray(q.answers) || q.answers.length === 0) {
    throw new Error("qcmToMultiChoice: question QCM invalide");
  }
  return {
    type: "multiple_choice",
    params: {
      media: { disableImageZooming: false },
      question: toP(q.question),
      answers: q.answers.map((a) => ({
        text: toDiv(a.text),
        correct: !!a.correct,
        tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" },
      })),
      overallFeedback: OVERALL_FEEDBACK,
      UI: {
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
      confirmCheck: CONFIRM_CHECK,
      confirmRetry: CONFIRM_RETRY,
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

function vfToTrueFalse(q) {
  if (!q || q.type !== "VF" || typeof q.correct !== "boolean") {
    throw new Error("vfToTrueFalse: question VF invalide");
  }
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
      l10n: {
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
      confirmCheck: CONFIRM_CHECK,
      confirmRetry: CONFIRM_RETRY,
    },
  };
}

// -- QRC → Blanks ------------------------------------------------------------

// Blanks utilise la syntaxe *réponse:indice* dans le texte de la question.
// On met la question suivie de la réponse masquée, ex. :
//   <p>Quelle est la capitale de la France ? *Paris:indice court*</p>
function qrcToBlanks(q) {
  if (!q || q.type !== "QRC" || !q.answer) {
    throw new Error("qrcToBlanks: question QRC invalide");
  }
  const answer = String(q.answer).replace(/\*/g, "").trim();
  const tip = q.explication ? String(q.explication).replace(/\*/g, "").trim() : "";
  const questionLine = tip
    ? `<p>${htmlEscape(q.question)} *${answer}:${tip}*</p>`
    : `<p>${htmlEscape(q.question)} *${answer}*</p>`;

  return {
    type: "fill_in_the_blanks",
    params: {
      media: { disableImageZooming: false },
      text: "<p>Complète la réponse :</p>",
      questions: [questionLine],
      overallFeedback: OVERALL_FEEDBACK,
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
      confirmCheck: CONFIRM_CHECK,
      confirmRetry: CONFIRM_RETRY,
    },
  };
}

// -- router ------------------------------------------------------------------

function toH5pPayload(q) {
  if (q.type === "QCM") return qcmToMultiChoice(q);
  if (q.type === "VF") return vfToTrueFalse(q);
  if (q.type === "QRC") return qrcToBlanks(q);
  throw new Error(`toH5pPayload: type non supporté: ${q.type}`);
}

module.exports = {
  toH5pPayload,
  qcmToMultiChoice,
  vfToTrueFalse,
  qrcToBlanks,
};
