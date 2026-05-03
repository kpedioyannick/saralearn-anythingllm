const path = require("path");
const {
  multiUserMode,
  userFromSession,
  reqBody,
  safeJsonParse,
} = require("../utils/http");

let _saraConfig = null;
function getSaraAdminId() {
  if (!_saraConfig) {
    try {
      _saraConfig = require(path.join(__dirname, "../sara.config.json"));
    } catch { _saraConfig = {}; }
  }
  return _saraConfig.admin_id || null;
}
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const { WorkspaceThread } = require("../models/workspaceThread");
const {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
} = require("../utils/middleware/validWorkspace");
const { WorkspaceChats } = require("../models/workspaceChats");
const { convertToChatHistory } = require("../utils/helpers/chat/responses");
const { getModelTag } = require("./utils");
const {
  listAssignedThreads,
  addAssignment,
  removeAssignment,
} = require("../utils/users/assignedThreads");
const {
  getSchedule,
  addSlot,
  updateSlot,
  deleteSlot,
} = require("../utils/users/schedule");

function workspaceThreadEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/thread/new",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { name, subchapterSlug } = reqBody(request);
        const { thread, message } = await WorkspaceThread.new(
          workspace,
          user?.id,
          { name, subchapterSlug }
        );
        await Telemetry.sendTelemetry(
          "workspace_thread_created",
          {
            multiUserMode: multiUserMode(response),
            LLMSelection: process.env.LLM_PROVIDER || "openai",
            Embedder: process.env.EMBEDDING_ENGINE || "inherit",
            VectorDbSelection: process.env.VECTOR_DB || "lancedb",
            TTSSelection: process.env.TTS_PROVIDER || "native",
            LLMModel: getModelTag(),
          },
          user?.id
        );

        await EventLogs.logEvent(
          "workspace_thread_created",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          user?.id
        );
        response.status(200).json({ thread, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/threads",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const adminId = getSaraAdminId();
        const userId = user?.id || null;
        const whereClause =
          adminId && userId && userId !== adminId
            ? { workspace_id: workspace.id, OR: [{ user_id: userId }, { user_id: adminId }, { user_id: null }] }
            : adminId && userId && userId === adminId
              ? { workspace_id: workspace.id, OR: [{ user_id: userId }, { user_id: null }] }
              : { workspace_id: workspace.id, user_id: userId };
        const threads = await WorkspaceThread.where(whereClause);
        response.status(200).json({ threads });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/thread/:threadSlug",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (_, response) => {
      try {
        const thread = response.locals.thread;
        await WorkspaceThread.delete({ id: thread.id });
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/thread-bulk-delete",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { slugs = [] } = reqBody(request);
        if (slugs.length === 0) return response.sendStatus(200).end();

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        await WorkspaceThread.delete({
          slug: { in: slugs },
          user_id: user?.id ?? null,
          workspace_id: workspace.id,
        });
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/thread/:threadSlug/chats",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;
        const history = await WorkspaceChats.where(
          {
            workspaceId: workspace.id,
            user_id: user?.id || null,
            thread_id: thread.id,
            api_session_id: null, // Do not include API session chats.
            include: true,
          },
          null,
          { id: "asc" }
        );

        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/update",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const data = reqBody(request);
        const currentThread = response.locals.thread;
        const { thread, message } = await WorkspaceThread.update(
          currentThread,
          data
        );
        response.status(200).json({ thread, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/thread/:threadSlug/delete-edited-chats",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const { startingId } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;

        await WorkspaceChats.delete({
          workspaceId: Number(workspace.id),
          thread_id: Number(thread.id),
          user_id: user?.id,
          id: { gte: Number(startingId) },
        });

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // List the current user's assigned threads (enriched with workspace + thread names)
  app.get(
    "/user/assigned-threads",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ assignedThreads: [] });
        const assignedThreads = await listAssignedThreads(user.id);
        response.status(200).json({ assignedThreads });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // Assign a thread to the current user (favorite/bookmark style)
  app.post(
    "/user/assigned-threads",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ success: false });
        const { workspaceSlug, threadSlug } = reqBody(request);
        if (!workspaceSlug || !threadSlug) {
          return response
            .status(400)
            .json({ success: false, error: "workspaceSlug and threadSlug required" });
        }
        await addAssignment(user.id, workspaceSlug, threadSlug);
        response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response
          .status(500)
          .json({ success: false, error: e.message || "Internal error" });
      }
    }
  );

  // Remove an assignment for the current user
  app.delete(
    "/user/assigned-threads/:workspaceSlug/:threadSlug",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ success: false });
        const { workspaceSlug, threadSlug } = request.params;
        await removeAssignment(user.id, workspaceSlug, threadSlug);
        response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response
          .status(500)
          .json({ success: false, error: e.message || "Internal error" });
      }
    }
  );

  // ----- User schedule (révision + cours scolaires) -----
  app.get(
    "/user/schedule",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ slots: [] });
        const slots = await getSchedule(user.id);
        response.status(200).json({ slots });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/user/schedule/slots",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ success: false });
        const slot = await addSlot(user.id, reqBody(request));
        response.status(200).json({ success: true, slot });
      } catch (e) {
        console.error(e.message, e);
        response
          .status(400)
          .json({ success: false, error: e.message || "Invalid slot" });
      }
    }
  );

  app.patch(
    "/user/schedule/slots/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ success: false });
        const slot = await updateSlot(user.id, request.params.id, reqBody(request));
        response.status(200).json({ success: true, slot });
      } catch (e) {
        console.error(e.message, e);
        response
          .status(400)
          .json({ success: false, error: e.message || "Invalid update" });
      }
    }
  );

  app.delete(
    "/user/schedule/slots/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) return response.status(401).json({ success: false });
        const removed = await deleteSlot(user.id, request.params.id);
        response.status(200).json({ success: removed });
      } catch (e) {
        console.error(e.message, e);
        response
          .status(500)
          .json({ success: false, error: e.message || "Internal error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/update-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const { chatId, newText = null, role = "assistant" } = reqBody(request);
        if (!newText || !String(newText).trim())
          throw new Error("Cannot save empty edit");

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;
        const existingChat = await WorkspaceChats.get({
          workspaceId: workspace.id,
          thread_id: thread.id,
          user_id: user?.id,
          id: Number(chatId),
        });
        if (!existingChat) throw new Error("Invalid chat.");

        if (role === "user") {
          await WorkspaceChats._update(existingChat.id, {
            prompt: String(newText),
          });
        } else {
          const chatResponse = safeJsonParse(existingChat.response, null);
          if (!chatResponse) throw new Error("Failed to parse chat response");
          await WorkspaceChats._update(existingChat.id, {
            response: JSON.stringify({
              ...chatResponse,
              text: String(newText),
            }),
          });
        }

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { workspaceThreadEndpoints };
