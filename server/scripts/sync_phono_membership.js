// Backfill — relie tous les users français existants au workspace phonetique.
//
// Pour les nouveaux users, le lien est posé automatiquement via /sara/register
// (cf. sara.js et sara.config.json -> shared_workspaces["phonetique"]).
// Ce script ne sert qu'à rattraper les users inscrits AVANT l'ajout de
// phonetique dans shared_workspaces. Idempotent.

require("dotenv").config({ path: __dirname + "/../.env.development" });
const prisma = require("../utils/prisma");

const TARGET_SLUG = "phonetique";
const ELIGIBLE_CLASSES = ["cm2", "6eme", "5eme", "4eme", "3eme", "2nde"];

(async () => {
  const ws = await prisma.workspaces.findUnique({ where: { slug: TARGET_SLUG } });
  if (!ws) { console.error(`[sync-phono] workspace ${TARGET_SLUG} introuvable`); process.exit(1); }

  const users = await prisma.users.findMany();
  let added = 0, skipped = 0, ineligible = 0;

  for (const u of users) {
    let classe = null;
    try {
      classe = JSON.parse(u.userSettings || "{}").classe || null;
    } catch (_) {}
    if (!ELIGIBLE_CLASSES.includes(classe)) { ineligible++; continue; }

    const existing = await prisma.workspace_users.findFirst({
      where: { workspace_id: ws.id, user_id: u.id },
    });
    if (existing) { skipped++; continue; }

    await prisma.workspace_users.create({
      data: { workspace_id: ws.id, user_id: u.id },
    });
    console.log(`[sync-phono] linké user=${u.id} (${u.username}, classe=${classe})`);
    added++;
  }

  console.log(`\n[sync-phono] résumé : +${added} ajoutés / ${skipped} déjà liés / ${ineligible} non éligibles`);
  await prisma.$disconnect();
})();
