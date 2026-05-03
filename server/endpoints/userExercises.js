const { Router } = require("express");
const prisma = require("../utils/prisma");
const {
  autoLinkExercise,
  computeThreadProgression,
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
