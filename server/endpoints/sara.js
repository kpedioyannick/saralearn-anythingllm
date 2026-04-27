const path = require("path");
const { User } = require("../models/user");
const { WorkspaceUser } = require("../models/workspaceUsers");
const { SystemSettings } = require("../models/systemSettings");
const { makeJWT, reqBody } = require("../utils/http");
const prisma = require("../utils/prisma");
const fetch = require("node-fetch");

const MAILJET_API_KEY = "0ec9c84121dff334954b321fbd9d50c0";
const MAILJET_SECRET_KEY = "62f50b98cbcd98614f74c12ef7f43b64";
const CONTACT_TO_EMAIL = "yannick.kpedio@gmail.com";
const CONTACT_TO_NAME = "Sara Support";

let _saraConfig = null;
function getSaraConfig() {
  if (!_saraConfig) {
    _saraConfig = require(path.join(__dirname, "../sara.config.json"));
  }
  return _saraConfig;
}

// Returns the program-specific config (classes, workspace_prefix, shared_workspaces)
function getProgramConfig(program) {
  const config = getSaraConfig();
  const pc = config.program_config?.[program];
  if (pc) return pc;
  // Backward-compat: flat structure for france
  return {
    classes: config.classes || [],
    workspace_prefix: config.workspace_prefix || {},
    shared_workspaces: config.shared_workspaces || {},
  };
}

// All valid classes across all programs
function getAllClasses() {
  const config = getSaraConfig();
  if (config.program_config) {
    return Object.values(config.program_config).flatMap(pc => pc.classes || []);
  }
  return config.classes || [];
}

function saraEndpoints(app) {
  if (!app) return;

  // Public — retourne la config d'inscription (classes, langs, programs)
  app.get("/sara/config", async (_req, res) => {
    try {
      const config = getSaraConfig();
      const { lang, program, langs, programs, program_config } = config;
      // All classes across all programs
      const classes = getAllClasses();
      res.status(200).json({ classes, lang, program, langs, programs, program_config });
    } catch (e) {
      console.error(e.message);
      res.sendStatus(500).end();
    }
  });

  // Public — inscription élève
  app.post("/sara/register", async (req, res) => {
    try {
      const multiUserMode = await SystemSettings.isMultiUserMode();
      if (!multiUserMode) {
        return res.status(403).json({ token: null, user: null, error: "Inscription non disponible." });
      }

      const { username, password, classe, lang: reqLang, program: reqProgram } = reqBody(req);
      const config = getSaraConfig();

      // Validate program
      const validProgram = (config.programs || []).find(p => p.value === reqProgram)?.value
        ?? config.program;

      // Validate lang
      const validLang = (config.langs || []).find(l => l.value === reqLang)?.value
        ?? config.lang;

      // Validate classe against the selected program
      const pc = getProgramConfig(validProgram);
      if (!pc.classes.includes(classe)) {
        return res.status(400).json({ token: null, user: null, error: "Classe invalide." });
      }

      const userSettings = JSON.stringify({
        classe,
        lang: validLang,
        program: validProgram,
      });

      const { user, error } = await User.create({
        username,
        password,
        role: "default",
        userSettings,
      });

      if (!user) {
        return res.status(200).json({ token: null, user: null, error });
      }

      // Workspaces de la classe
      const prefix = pc.workspace_prefix[classe];
      const classWorkspaces = prefix
        ? await prisma.workspaces.findMany({
            where: { name: { startsWith: `${prefix} — ` } },
            select: { id: true },
          })
        : [];

      // Workspaces partagés selon la classe
      const sharedSlugs = Object.entries(pc.shared_workspaces || {})
        .filter(([, eligibleClasses]) => eligibleClasses.includes(classe))
        .map(([slug]) => slug);

      const sharedWorkspaces = sharedSlugs.length > 0
        ? await prisma.workspaces.findMany({
            where: { slug: { in: sharedSlugs } },
            select: { id: true },
          })
        : [];

      const allWorkspaceIds = [
        ...classWorkspaces.map(w => w.id),
        ...sharedWorkspaces.map(w => w.id),
      ];

      if (allWorkspaceIds.length > 0) {
        await WorkspaceUser.createMany(user.id, allWorkspaceIds);
      }

      if (!process.env.JWT_SECRET) {
        console.error("[Sara] JWT_SECRET non défini");
        return res.sendStatus(500).end();
      }

      const token = makeJWT(
        { id: user.id, username: user.username },
        process.env.JWT_EXPIRY ?? "30d"
      );

      res.status(200).json({ token, user, error: null });
    } catch (e) {
      console.error(e.message, e);
      res.sendStatus(500).end();
    }
  });

  // Proxy vidéo pédagogique → saralearn-video API
  const VIDEO_API_URL = process.env.SARA_VIDEO_API_URL || "http://localhost:3457";

  app.post("/sara/video", async (req, res) => {
    try {
      const payload = reqBody(req);
      const r = await fetch(`${VIDEO_API_URL}/api/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      res.status(r.status).json(data);
    } catch (e) {
      console.error("[Sara] Video API error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Upgrade preview → HD : relance le rendu en quality "hd" sur le même job.
  app.post("/sara/video/:videoId/upgrade", async (req, res) => {
    try {
      const { videoId } = req.params;
      const r = await fetch(`${VIDEO_API_URL}/api/videos/${videoId}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json();
      res.status(r.status).json(data);
    } catch (e) {
      console.error("[Sara] Video upgrade error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/sara/video/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const r = await fetch(`${VIDEO_API_URL}/api/videos/${videoId}`);
      const data = await r.json();
      // Réécrire videoUrl pour pointer vers le proxy serveur
      if (data.videoUrl) {
        data.videoUrl = data.videoUrl.replace(VIDEO_API_URL, "");
        data.videoUrl = `/sara/video-file${data.videoUrl}`;
      }
      res.status(r.status).json(data);
    } catch (e) {
      console.error("[Sara] Video status error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Proxy fichiers MP4 générés
  app.get("/sara/video-file/videos/:file", async (req, res) => {
    try {
      const { file } = req.params;
      const r = await fetch(`${VIDEO_API_URL}/videos/${file}`);
      if (!r.ok) return res.status(404).send("Not found");
      res.setHeader("Content-Type", "video/mp4");
      r.body.pipe(res);
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  // Public — formulaire de contact via Mailjet
  app.post("/sara/contact", async (req, res) => {
    try {
      const { name, email, message } = reqBody(req);
      if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: "Champs manquants" });
      }

      const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString("base64");
      const payload = {
        Messages: [{
          From: { Email: "yannick.kpedio@gmail.com", Name: "Sara" },
          To: [{ Email: CONTACT_TO_EMAIL, Name: CONTACT_TO_NAME }],
          ReplyTo: { Email: email, Name: name },
          Subject: `[Sara] Message de ${name}`,
          TextPart: `De : ${name} <${email}>\n\n${message}`,
          HTMLPart: `<p><strong>De :</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, "<br>")}</p>`,
        }],
      };

      const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await mjRes.json();
      if (data?.Messages?.[0]?.Status === "success") {
        return res.status(200).json({ ok: true });
      }
      console.error("[Sara] Mailjet error:", JSON.stringify(data));
      return res.status(500).json({ ok: false, error: "Mailjet error" });
    } catch (e) {
      console.error("[Sara] Contact error:", e.message);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}

module.exports = { saraEndpoints, getSaraConfig, getProgramConfig };
