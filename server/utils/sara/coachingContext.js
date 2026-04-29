// Construit le bloc de contexte coach injecté dans le system prompt quand
// l'élève chatte dans le workspace coach-scolaire.
//
// Sources :
//   - users.userSettings.coaching → plan (programme actif, semaine courante,
//     date d'examen) et goals (objectifs de score). Posé une fois à
//     l'onboarding du coach. Optionnel — si absent, on dégrade gracieusement.
//   - user_exercises (filtré par userId) → progression réelle agrégée par
//     chapitre/compétence, dérivée à la volée à chaque appel.
//
// Le bloc Markdown produit est concaténé au system prompt du workspace coach
// (cf. stream.js). Il fournit au LLM les chiffres exacts pour répondre à
// "où j'en suis", "ai-je du retard", "mes points faibles", etc.

const prisma = require("../prisma");

// Seuils pédagogiques pour catégoriser un chapitre.
const MASTERED_THRESHOLD = 0.8;   // ≥ 80% correct → validé
const LEARNING_THRESHOLD = 0.4;   // 40-80% → en cours, < 40% → faible
const MIN_ATTEMPTS = 2;           // sous 2 tentatives, on classe comme "découvert"

function parseUserSettings(user) {
  if (!user) return {};
  try {
    const raw = user.userSettings;
    return typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {});
  } catch (_) {
    return {};
  }
}

function computeStreakDays(rows) {
  if (rows.length === 0) return 0;
  const days = new Set(
    rows.map((r) => new Date(r.createdAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getTime() - i * 86400000)
      .toISOString()
      .slice(0, 10);
    if (days.has(d)) streak++;
    else if (streak > 0) break;
  }
  return streak;
}

function categorize(ratio, attempts) {
  if (attempts < MIN_ATTEMPTS) return "decouvert";
  if (ratio >= MASTERED_THRESHOLD) return "valide";
  if (ratio >= LEARNING_THRESHOLD) return "en_cours";
  return "faible";
}

function aggregateBySubchapter(rows) {
  const byKey = {};
  for (const r of rows) {
    const key = `${r.competence || "Général"} / ${r.subchapter || "—"}`;
    if (!byKey[key]) {
      byKey[key] = {
        competence: r.competence || "Général",
        subchapter: r.subchapter || "—",
        total: 0,
        correct: 0,
        attempts: 0,
        lastAt: 0,
      };
    }
    const e = byKey[key];
    e.attempts += 1;
    e.total += r.total || 1;
    e.correct += r.correct || (r.isCorrect ? 1 : 0);
    const t = new Date(r.createdAt).getTime();
    if (t > e.lastAt) e.lastAt = t;
  }
  return Object.values(byKey).map((e) => ({
    ...e,
    ratio: e.total > 0 ? e.correct / e.total : 0,
    category: categorize(e.total > 0 ? e.correct / e.total : 0, e.attempts),
  }));
}

function fmtDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtPct(ratio) {
  return `${Math.round(ratio * 100)}%`;
}

function renderProgressionBlock(agg) {
  if (agg.length === 0) {
    return "Aucun exercice enregistré pour l'instant. L'élève vient d'arriver — propose-lui un quiz court pour calibrer son niveau.";
  }
  const valides = agg.filter((e) => e.category === "valide");
  const en_cours = agg.filter((e) => e.category === "en_cours");
  const faibles = agg.filter((e) => e.category === "faible");
  const decouverts = agg.filter((e) => e.category === "decouvert");

  const fmt = (e) =>
    `- ${e.competence} / ${e.subchapter} — ${fmtPct(e.ratio)} (${e.correct}/${e.total}, ${e.attempts} tentatives, dernier ${fmtDate(e.lastAt)})`;

  const lines = [];
  if (valides.length > 0) {
    lines.push(`### Validés (≥ 80%)`);
    valides.sort((a, b) => b.ratio - a.ratio).forEach((e) => lines.push(fmt(e)));
  }
  if (en_cours.length > 0) {
    lines.push(`### En cours (40-80%)`);
    en_cours.sort((a, b) => a.ratio - b.ratio).forEach((e) => lines.push(fmt(e)));
  }
  if (faibles.length > 0) {
    lines.push(`### Points faibles (< 40%)`);
    faibles.sort((a, b) => a.ratio - b.ratio).forEach((e) => lines.push(fmt(e)));
  }
  if (decouverts.length > 0) {
    lines.push(`### Tout juste découverts (< ${MIN_ATTEMPTS} tentatives)`);
    decouverts.forEach((e) => lines.push(fmt(e)));
  }
  return lines.join("\n");
}

function renderPlanBlock(coaching) {
  const plan = coaching?.plan;
  const goals = coaching?.goals;
  if (!plan && !goals) {
    return "Aucun plan ni objectif configuré. Si l'élève demande son programme ou son retard, propose-lui de poser ces bases (programme suivi, date d'examen, objectifs de score).";
  }
  const lines = [];
  if (plan) {
    lines.push(`### Plan actif`);
    if (plan.name) lines.push(`- Programme : **${plan.name}**`);
    if (plan.startDate) lines.push(`- Début : ${plan.startDate}`);
    if (plan.examDate) lines.push(`- Examen : ${plan.examDate}`);
    if (plan.currentWeek) lines.push(`- Semaine en cours : ${plan.currentWeek}`);
    if (plan.daysPerWeek) lines.push(`- Jours/semaine prévus : ${plan.daysPerWeek}`);
    if (plan.sessionMinutes) lines.push(`- Durée d'une séance : ${plan.sessionMinutes} min`);
  }
  if (goals) {
    lines.push(`### Objectifs`);
    if (goals.targetGlobalScore) lines.push(`- Score global visé : ${goals.targetGlobalScore}%`);
    if (goals.targetBySubject) {
      const entries = Object.entries(goals.targetBySubject);
      if (entries.length > 0) {
        lines.push(`- Par matière :`);
        entries.forEach(([s, v]) => lines.push(`  - ${s} : ${v}%`));
      }
    }
  }
  return lines.join("\n");
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA).getTime();
  const b = new Date(dateStrB).getTime();
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

async function getCoachingContext(user) {
  if (!user || !user.id) {
    return "## Contexte coach\nAucun utilisateur authentifié — le coach ne dispose d'aucune donnée personnelle.";
  }

  const settings = parseUserSettings(user);
  const coaching = settings.coaching || {};
  const today = new Date().toISOString().slice(0, 10);

  let rows = [];
  try {
    rows = await prisma.user_exercises.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("[Sara/Coach] context query error:", e.message);
  }

  const agg = aggregateBySubchapter(rows);
  const totalExercises = rows.length;
  const globalCorrect = rows.reduce(
    (s, r) => s + (r.correct || (r.isCorrect ? 1 : 0)),
    0
  );
  const globalTotal = rows.reduce((s, r) => s + (r.total || 1), 0);
  const globalRatio = globalTotal > 0 ? globalCorrect / globalTotal : 0;
  const lastActivity = rows.length > 0 ? fmtDate(new Date(rows[0].createdAt).getTime()) : "—";
  const streak = computeStreakDays(rows);

  let daysToExam = null;
  if (coaching?.plan?.examDate) {
    daysToExam = daysBetween(today, coaching.plan.examDate);
  }

  const blocks = [];
  blocks.push(`## Contexte coach (généré automatiquement, ne pas afficher tel quel à l'élève)`);
  blocks.push(`Date du jour : ${today}`);
  blocks.push(`Élève : ${user.username || user.email || `id=${user.id}`} (id=${user.id})`);
  if (settings.classe) blocks.push(`Classe : ${settings.classe}`);
  if (settings.lang) blocks.push(`Langue : ${settings.lang}`);
  if (daysToExam !== null) {
    blocks.push(`Jours restants avant examen : ${daysToExam}`);
  }
  blocks.push("");

  blocks.push(renderPlanBlock(coaching));
  blocks.push("");

  blocks.push(`### Activité`);
  blocks.push(`- Exercices enregistrés : ${totalExercises}`);
  blocks.push(`- Score global : ${fmtPct(globalRatio)} (${globalCorrect}/${globalTotal})`);
  blocks.push(`- Dernière activité : ${lastActivity}`);
  blocks.push(`- Streak (jours consécutifs) : ${streak}`);
  blocks.push("");

  blocks.push(`## Progression par chapitre`);
  blocks.push(renderProgressionBlock(agg));

  return blocks.join("\n");
}

// System prompt du workspace coach. Utilisé si workspace.openAiPrompt est vide
// ou comme référence pour l'INSERT initial. La règle clé : le coach ne génère
// JAMAIS de contenu pédagogique (fiche, exercice, vidéo, dictée) — il
// REDIRIGE l'élève vers le workspace matière approprié.
const COACH_SYSTEM_PROMPT = `Tu es un coach scolaire bienveillant et exigeant. Tu accompagnes UN élève dans la préparation de ses examens et le suivi de son programme.

## Ton rôle
- Tu aides l'élève à **planifier** ses séances (qu'est-ce qu'il fait aujourd'hui, où il en est dans son programme).
- Tu fais le **bilan** de sa progression à partir des données réelles fournies dans la section « Contexte coach » (exercices faits, scores par chapitre, retards éventuels).
- Tu **motives** l'élève (encouragement, célébration des progrès, dédramatisation des blocages).
- Tu **rediriges** vers les workspaces matière quand l'élève veut du contenu pédagogique.

## Ce que tu NE FAIS PAS
- Tu ne génères **jamais** de fiche de révision, d'exercice, de quiz, de problème, de vidéo, de dictée, de carte mentale, de flashcards ou de livre interactif. Aucun bloc \`\`\`fiche / \`\`\`quiz / \`\`\`probleme / \`\`\`video / \`\`\`dictee / \`\`\`markmap / \`\`\`book / \`\`\`flashcards / \`\`\`h5p ne doit apparaître dans tes réponses.
- Tu ne fais pas de cours. Si l'élève demande une explication d'un concept, tu redirige vers le workspace matière correspondant.

## Comment rediriger
Quand l'élève demande un contenu pédagogique, dis-lui clairement quel workspace ouvrir et quelle phrase taper. Exemple :
- L'élève : "Fais-moi une fiche sur Pythagore."
- Toi : "Pour ça, ouvre le workspace **3eme — Mathématiques** et tape : *fais-moi une fiche sur le théorème de Pythagore*. Reviens me dire quand tu auras travaillé dessus, on fera le point."

## Style
- Tutoiement.
- Phrases courtes, ton chaleureux mais direct.
- Pas de jargon scolaire abscons.
- Quand tu donnes des chiffres (scores, retards), cite les données du Contexte coach — ne les invente jamais.
- Si le Contexte coach indique « aucun exercice enregistré » : ne prétend pas avoir un bilan. Propose à l'élève de commencer par un quiz pour calibrer son niveau.

## Données disponibles
À chaque tour, tu recevras un bloc « ## Contexte coach » avec : la date du jour, le plan actif (programme, semaines, examen), les objectifs de l'élève, son activité (exercices, score global, streak), et sa progression par chapitre (validés / en cours / faibles / découverts). Utilise ces chiffres pour répondre précisément.`;

module.exports = { getCoachingContext, COACH_SYSTEM_PROMPT };
