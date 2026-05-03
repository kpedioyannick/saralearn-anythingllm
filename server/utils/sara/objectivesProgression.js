/**
 * Service de progression sur les objectifs d'apprentissage.
 *
 * - Auto-link : associe un user_exercise à un thread_objective via embedding cosine
 * - Progression : agrège les exos d'un user sur un thread, calcule statut par objectif
 *
 * Critères validation :
 *   - todo        : 0 exo
 *   - in_progress : 1-9 exos
 *   - validated   : ≥10 exos ET ≥80% réussite
 *   - struggling  : ≥10 exos ET <80% réussite
 */

const prisma = require("../prisma");
const { embedQuery, embedPassage, cosineSimilarity } = require("./intentDetector");

const VALIDATE_THRESHOLD_COUNT = 10;
const VALIDATE_THRESHOLD_SUCCESS = 0.8;
const MATCH_THRESHOLD = 0.7;

// Cache en mémoire : { threadId: [{ id, title, embedding }] }
// Vidé au pm2 restart, suffisant pour 99% des cas. Re-fetch si nouveau thread.
const objectiveEmbeddingCache = new Map();

async function getObjectivesWithEmbeddings(threadId) {
  if (objectiveEmbeddingCache.has(threadId)) return objectiveEmbeddingCache.get(threadId);
  const objs = await prisma.thread_objectives.findMany({
    where: { threadId },
    orderBy: { orderIndex: "asc" },
  });
  if (objs.length === 0) {
    objectiveEmbeddingCache.set(threadId, []);
    return [];
  }
  // Embed tous les titres en parallèle
  const withEmb = await Promise.all(
    objs.map(async (o) => ({
      id: o.id,
      title: o.title,
      slug: o.slug,
      orderIndex: o.orderIndex,
      embedding: await embedPassage(o.title),
    }))
  );
  // On garde seulement ceux qui ont un embedding réussi
  const valid = withEmb.filter((o) => Array.isArray(o.embedding) && o.embedding.length > 0);
  objectiveEmbeddingCache.set(threadId, valid);
  return valid;
}

/**
 * Trouve l'objectif le plus pertinent pour un texte donné (objective: ou statement).
 * Renvoie l'ID ou null si pas de match au-dessus du seuil.
 */
async function matchObjective(threadId, text) {
  if (!text || !threadId) return null;
  const objs = await getObjectivesWithEmbeddings(threadId);
  if (objs.length === 0) return null;

  const queryVec = await embedQuery(text);
  if (!Array.isArray(queryVec)) return null;

  let best = null;
  let bestScore = -1;
  for (const o of objs) {
    const score = cosineSimilarity(queryVec, o.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  if (bestScore < MATCH_THRESHOLD) return null;
  return { id: best.id, title: best.title, slug: best.slug, score: bestScore };
}

/**
 * Auto-link un exercice à un objectif.
 * Stratégie :
 *   1. Si `objectiveTitle` fourni explicitement (depuis la ligne `objective:` du bloc) → match direct
 *   2. Sinon → match sur le `statement` de l'exo
 */
async function autoLinkExercise({ threadId, statement, objectiveTitle = null }) {
  if (!threadId) return null;
  const candidate = objectiveTitle || statement;
  if (!candidate || candidate.trim().length < 3) return null;
  try {
    const match = await matchObjective(threadId, candidate);
    return match ? match.id : null;
  } catch (err) {
    console.error("[autoLinkExercise] error:", err.message);
    return null;
  }
}

/**
 * Calcule la progression d'un user sur un thread :
 * pour chaque objectif → nb exos, % réussite, statut.
 */
async function computeThreadProgression({ threadId, userId, deviceId }) {
  if (!threadId) return [];
  const objectives = await prisma.thread_objectives.findMany({
    where: { threadId },
    orderBy: { orderIndex: "asc" },
  });
  if (objectives.length === 0) return [];

  // Récupère tous les exos de cet user sur ce thread
  const exoWhere = { threadId };
  if (userId) exoWhere.userId = Number(userId);
  else if (deviceId) exoWhere.deviceId = deviceId;
  else return objectives.map(formatTodoObjective);

  const exos = await prisma.user_exercises.findMany({
    where: exoWhere,
    select: { id: true, threadObjectiveId: true, isCorrect: true, total: true, correct: true },
  });

  // Agrège par objective_id
  const stats = {};
  for (const o of objectives) stats[o.id] = { total: 0, correct: 0 };
  for (const e of exos) {
    if (!e.threadObjectiveId) continue;
    if (!stats[e.threadObjectiveId]) continue;
    stats[e.threadObjectiveId].total += 1;
    if (e.isCorrect === true) stats[e.threadObjectiveId].correct += 1;
  }

  return objectives.map((o) => {
    const s = stats[o.id] || { total: 0, correct: 0 };
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      description: o.description,
      orderIndex: o.orderIndex,
      attempted: s.total,
      correct: s.correct,
      successRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      status: computeStatus(s.total, s.correct),
    };
  });
}

function formatTodoObjective(o) {
  return {
    id: o.id,
    slug: o.slug,
    title: o.title,
    description: o.description,
    orderIndex: o.orderIndex,
    attempted: 0,
    correct: 0,
    successRate: 0,
    status: "todo",
  };
}

function computeStatus(total, correct) {
  if (total === 0) return "todo";
  if (total < VALIDATE_THRESHOLD_COUNT) return "in_progress";
  const rate = correct / total;
  if (rate >= VALIDATE_THRESHOLD_SUCCESS) return "validated";
  return "struggling";
}

function invalidateCacheForThread(threadId) {
  objectiveEmbeddingCache.delete(threadId);
}

module.exports = {
  autoLinkExercise,
  computeThreadProgression,
  matchObjective,
  invalidateCacheForThread,
  VALIDATE_THRESHOLD_COUNT,
  VALIDATE_THRESHOLD_SUCCESS,
};
