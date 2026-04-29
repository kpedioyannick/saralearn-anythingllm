// One-shot setup du workspace "Coach Scolaire" pour user 1.
// - INSERT workspaces (slug=coach-scolaire) avec COACH_SYSTEM_PROMPT
// - INSERT workspace_users (user 1 ↔ coach workspace)
// - Patch users.userSettings de user 1 avec coaching.plan + goals (V1)
//
// Idempotent : si le workspace existe déjà, on update son openAiPrompt et on
// laisse les autres lignes intactes.

require("dotenv").config({ path: __dirname + "/../.env.development" });
const prisma = require("../utils/prisma");
const { COACH_SYSTEM_PROMPT } = require("../utils/sara/coachingContext");

const COACH_SLUG = "coach-scolaire";
const COACH_NAME = "Coach Scolaire";
const TARGET_USER_ID = 1;

const COACHING_DEFAULTS = {
  plan: {
    name: "Brevet 2026 — préparation",
    startDate: "2026-04-28",
    examDate: "2026-06-26",
    currentWeek: 1,
    daysPerWeek: 6,
    sessionMinutes: 90,
  },
  goals: {
    targetGlobalScore: 80,
    targetBySubject: {
      "Mathématiques": 75,
      "Français": 85,
      "Histoire-Géographie": 80,
      "Sciences": 75,
    },
  },
};

async function upsertWorkspace() {
  const existing = await prisma.workspaces.findUnique({
    where: { slug: COACH_SLUG },
  });
  if (existing) {
    console.log(`[setup-coach] Workspace existant id=${existing.id}, update prompt`);
    await prisma.workspaces.update({
      where: { id: existing.id },
      data: { openAiPrompt: COACH_SYSTEM_PROMPT, name: COACH_NAME },
    });
    return existing.id;
  }
  const created = await prisma.workspaces.create({
    data: {
      name: COACH_NAME,
      slug: COACH_SLUG,
      openAiPrompt: COACH_SYSTEM_PROMPT,
      openAiHistory: 20,
      chatMode: "chat",
      similarityThreshold: 0.25,
      topN: 4,
      vectorSearchMode: "default",
    },
  });
  console.log(`[setup-coach] Workspace créé id=${created.id}`);
  return created.id;
}

async function ensureMembership(workspaceId, userId) {
  const existing = await prisma.workspace_users.findFirst({
    where: { workspace_id: workspaceId, user_id: userId },
  });
  if (existing) {
    console.log(`[setup-coach] workspace_users existant pour user=${userId}`);
    return;
  }
  await prisma.workspace_users.create({
    data: { user_id: userId, workspace_id: workspaceId },
  });
  console.log(`[setup-coach] workspace_users créé pour user=${userId}`);
}

async function patchUserSettings(userId) {
  const u = await prisma.users.findUnique({ where: { id: userId } });
  if (!u) {
    console.error(`[setup-coach] user id=${userId} introuvable`);
    return;
  }
  let settings = {};
  try {
    settings = JSON.parse(u.userSettings || "{}");
  } catch (_) {}
  if (!settings.coaching) {
    settings.coaching = COACHING_DEFAULTS;
    console.log(`[setup-coach] coaching defaults injectés`);
  } else {
    console.log(`[setup-coach] coaching déjà présent — pas écrasé`);
  }
  if (!settings.lang) settings.lang = "fr";
  if (!settings.classe) settings.classe = "3eme";
  if (!settings.program) settings.program = "brevet-2026";
  await prisma.users.update({
    where: { id: userId },
    data: { userSettings: JSON.stringify(settings) },
  });
  console.log(`[setup-coach] userSettings patchés pour user=${userId}:`, settings);
}

(async () => {
  try {
    const wsId = await upsertWorkspace();
    await ensureMembership(wsId, TARGET_USER_ID);
    await patchUserSettings(TARGET_USER_ID);
    console.log("[setup-coach] OK");
  } catch (e) {
    console.error("[setup-coach] ERR:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
