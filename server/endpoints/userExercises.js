const { Router } = require("express");
const prisma = require("../utils/prisma");

const router = Router();

// POST /api/v1/user/exercises — enregistre un résultat quiz
router.post("/", async (req, res) => {
  try {
    const {
      deviceId,
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
    } = req.body;

    if (!deviceId || !threadId) {
      return res.status(400).json({ error: "deviceId and threadId required" });
    }

    const exercise = await prisma.user_exercises.create({
      data: {
        deviceId,
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

    res.json({ exercise });
  } catch (err) {
    console.error("user_exercises POST error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/user/exercises/progress?deviceId=&threadId=
router.get("/progress", async (req, res) => {
  try {
    const { deviceId, threadId } = req.query;
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });

    const where = { deviceId };
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
