const { Router } = require("express");
const prisma = require("../utils/prisma");
const {
  autoLinkExercise,
  computeThreadProgression,
  VALIDATE_THRESHOLD_COUNT,
  VALIDATE_THRESHOLD_SUCCESS,
} = require("../utils/sara/objectivesProgression");

const router = Router();

// POST /api/v1/user/exercises — enregistre un résultat quiz
router.post("/", async (req, res) => {
  try {
    const {
      deviceId,
      userId,
      workspaceId,
      threadId,
      competence,
      subchapter,
      statement,
      response,
      questionType = "qcm",
      isCorrect,
      total = 0,
      correct = 0,
      // Optionnel : objectiveTitle si Sara a annoté l'exo avec `objective: ...`
      // (extrait côté frontend depuis le bloc ```quiz)
      objectiveTitle = null,
    } = req.body;

    if (!deviceId || !threadId) {
      return res.status(400).json({ error: "deviceId and threadId required" });
    }

    const exercise = await prisma.user_exercises.create({
      data: {
        deviceId,
        userId: userId ? Number(userId) : null,
        workspaceId: Number(workspaceId) || 0,
        threadId: Number(threadId) || 0,
        competence: competence || "",
        subchapter: subchapter || "",
        statement: statement || "",
        response: response || null,
        questionType,
        isCorrect: isCorrect ?? null,
        total: Number(total) || 0,
        correct: Number(correct) || 0,
        objectiveTitle: objectiveTitle || null,
      },
    });

    // Auto-link à un thread_objective via embedding (best-effort, ne bloque pas la réponse)
    autoLinkExercise({
      threadId: Number(threadId),
      statement,
      objectiveTitle,
    })
      .then(async (objectiveId) => {
        if (objectiveId) {
          await prisma.user_exercises.update({
            where: { id: exercise.id },
            data: { threadObjectiveId: objectiveId },
          });
        }
      })
      .catch((err) => console.error("[autoLinkExercise] post-insert error:", err.message));

    res.json({ exercise });
  } catch (err) {
    console.error("user_exercises POST error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/user/exercises/objectives/by-workspace?workspaceId=&userId=&deviceId=
// Retourne, pour chaque thread du workspace, l'agrégat {total, validated, inProgress}
// pour cet utilisateur. Permet d'afficher la progression sur la liste des chapitres
// sans déclencher N requêtes côté front.
router.get("/objectives/by-workspace", async (req, res) => {
  try {
    const { workspaceId, userId, deviceId } = req.query;
    if (!workspaceId)
      return res.status(400).json({ error: "workspaceId required" });

    const wsId = Number(workspaceId);
    const threads = await prisma.workspace_threads.findMany({
      where: { workspace_id: wsId },
      select: { id: true },
    });
    if (threads.length === 0) return res.json({ progress: {} });

    const threadIds = threads.map((t) => t.id);
    const objectives = await prisma.thread_objectives.findMany({
      where: { threadId: { in: threadIds } },
      select: { id: true, threadId: true },
    });
    if (objectives.length === 0) return res.json({ progress: {} });

    const objectiveIds = objectives.map((o) => o.id);
    const exoWhere = { threadObjectiveId: { in: objectiveIds } };
    if (userId) exoWhere.userId = Number(userId);
    else if (deviceId) exoWhere.deviceId = deviceId;
    else {
      // No identity → return totals only, with zero attempted.
      const progress = {};
      for (const t of threads) progress[t.id] = { total: 0, validated: 0, inProgress: 0 };
      for (const o of objectives) progress[o.threadId].total += 1;
      return res.json({ progress });
    }

    const exos = await prisma.user_exercises.findMany({
      where: exoWhere,
      select: { threadObjectiveId: true, isCorrect: true },
    });

    const perObjective = {};
    for (const o of objectives) perObjective[o.id] = { threadId: o.threadId, total: 0, correct: 0 };
    for (const e of exos) {
      const stat = perObjective[e.threadObjectiveId];
      if (!stat) continue;
      stat.total += 1;
      if (e.isCorrect === true) stat.correct += 1;
    }

    const progress = {};
    for (const t of threads) progress[t.id] = { total: 0, validated: 0, inProgress: 0 };
    for (const o of objectives) progress[o.threadId].total += 1;
    for (const objId of Object.keys(perObjective)) {
      const s = perObjective[objId];
      if (s.total === 0) continue;
      if (s.total < VALIDATE_THRESHOLD_COUNT) {
        progress[s.threadId].inProgress += 1;
      } else if (s.correct / s.total >= VALIDATE_THRESHOLD_SUCCESS) {
        progress[s.threadId].validated += 1;
      } else {
        progress[s.threadId].inProgress += 1;
      }
    }

    res.json({ progress });
  } catch (err) {
    console.error("user_exercises GET /objectives/by-workspace error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/user/exercises/objectives?threadId=&userId=&deviceId=
// Retourne la progression sur les objectifs d'un thread pour cet utilisateur.
router.get("/objectives", async (req, res) => {
  try {
    const { threadId, userId, deviceId } = req.query;
    if (!threadId) return res.status(400).json({ error: "threadId required" });
    const progress = await computeThreadProgression({
      threadId: Number(threadId),
      userId: userId ? Number(userId) : null,
      deviceId: deviceId || null,
    });
    res.json({ objectives: progress });
  } catch (err) {
    console.error("user_exercises GET /objectives error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/user/exercises/progress?deviceId=&threadId=&userId=
// Filtre par userId si fourni (priorité sur deviceId pour cross-device).
router.get("/progress", async (req, res) => {
  try {
    const { deviceId, threadId, userId } = req.query;
    if (!deviceId && !userId)
      return res.status(400).json({ error: "deviceId or userId required" });

    const where = {};
    if (userId) where.userId = Number(userId);
    else where.deviceId = deviceId;
    if (threadId) where.threadId = Number(threadId);

    const rows = await prisma.user_exercises.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Agrégat par compétence
    const byCompetence = {};
    for (const r of rows) {
      const key = r.competence || "Général";
      if (!byCompetence[key]) {
        byCompetence[key] = {
          competence: key,
          threadId: r.threadId,
          subchapter: r.subchapter,
          total: 0,
          correct: 0,
          exercises: [],
        };
      }
      byCompetence[key].total += r.total || 1;
      byCompetence[key].correct += r.correct || (r.isCorrect ? 1 : 0);
      byCompetence[key].exercises.push(r);
    }

    res.json({ progress: Object.values(byCompetence) });
  } catch (err) {
    console.error("user_exercises GET progress error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };
