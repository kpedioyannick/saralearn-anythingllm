const { v4: uuidv4 } = require("uuid");
const { DocumentManager } = require("../DocumentManager");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const { getVectorDbClass, getLLMProvider } = require("../helpers");
const { writeResponseChunk } = require("../helpers/chat/responses");
const { grepAgents } = require("./agents");
const {
  grepCommand,
  VALID_COMMANDS,
  chatPrompt,
  recentChatHistory,
  sourceIdentifier,
} = require("./index");

const { detectIntent, getIntentTemplate } = require("../sara/intentDetector");
const { Document } = require("../../models/documents");

const VIDEO_API_URL = process.env.SARA_VIDEO_API_URL || "http://localhost:3457";
const fetch = require("node-fetch");

async function processVideoBlock(text) {
  const match = text.match(/```video\n([\s\S]*?)```/);
  if (!match) return text;
  let payload;
  try {
    const jsonStr = match[1].trim().match(/\{[\s\S]*\}/)?.[0];
    if (!jsonStr) return text;
    payload = JSON.parse(jsonStr);
    if (!payload.slides) return text;
  } catch { return text; }

  try {
    const r = await fetch(`${VIDEO_API_URL}/api/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { videoId } = await r.json();
    if (!videoId) return text;

    // Poll jusqu'à done ou error (max 3 min)
    for (let i = 0; i < 60; i++) {
      await new Promise((res) => setTimeout(res, 3000));
      const s = await fetch(`${VIDEO_API_URL}/api/videos/${videoId}`).then((r) => r.json());
      if (s.status === "done" && s.videoUrl) {
        const proxyUrl = `/api/sara/video-file/videos/${videoId}.mp4`;
        return text.replace(match[0], `\`\`\`video-url\n${proxyUrl}\n\`\`\``);
      }
      if (s.status === "error") return text;
    }
  } catch (e) {
    console.error("[Sara] Video generation error:", e.message);
  }
  return text;
}

const VALID_CHAT_MODE = ["automatic", "chat", "query"];

async function streamChatWithWorkspace(
  response,
  workspace,
  message,
  chatMode = "automatic",
  user = null,
  thread = null,
  attachments = []
) {
  const uuid = uuidv4();
  const updatedMessage = await grepCommand(message, user);
  // Thread "Dictée" → intent dictée automatique, sinon détection par vecteurs
  const isDicteeThread = thread?.name?.toLowerCase().includes("dict");
  const intent = isDicteeThread ? "dictee" : await detectIntent(updatedMessage);
  const intentPrefix = intent ? getIntentTemplate(intent, thread?.name) : "";

  // Thread Dictée : pas de RAG, le LLM génère le texte lui-même
  if (isDicteeThread) chatMode = "chat";

  // Intent vidéo : générer les slides, appeler l'API vidéo, retourner l'URL directement
  if (intent === "video") {
    writeResponseChunk(response, {
      uuid, sources: [], type: "textResponseChunk",
      textResponse: "⏳ Génération de la vidéo en cours…", close: false, error: false,
    });

    try {
      const LLMConnector = getLLMProvider({ provider: workspace?.chatProvider, model: workspace?.chatModel });
      const videoPrompt = `${updatedMessage}${intentPrefix}`;
      const { textResponse: slidesText } = await LLMConnector.getChatCompletion([
        { role: "system", content: await chatPrompt(workspace, null) },
        { role: "user", content: videoPrompt },
      ], { temperature: 0.7 });

      const jsonMatch = slidesText?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Pas de JSON dans la réponse LLM");
      const payload = JSON.parse(jsonMatch[0]);
      if (!payload.slides) throw new Error("Pas de slides dans le JSON");
      // Normaliser les champs que le LLM peut nommer différemment
      payload.slides = payload.slides.map((s, i) => ({
        id: s.id || `s${i + 1}`,
        title: s.title || s.heading || s.name || `Slide ${i + 1}`,
        description: s.description || s.content || s.text || s.body || "",
        subtitlesSrt: s.subtitlesSrt || s.subtitle || s.narration || s.audio || s.description || s.content || "",
      }));

      const r = await fetch(`${VIDEO_API_URL}/api/videos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { videoId } = await r.json();
      if (!videoId) throw new Error("Pas de videoId");

      for (let i = 0; i < 60; i++) {
        await new Promise((res) => setTimeout(res, 3000));
        const s = await fetch(`${VIDEO_API_URL}/api/videos/${videoId}`).then((r) => r.json());
        if (s.status === "done") {
          const proxyUrl = `/api/sara/video-file/videos/${videoId}.mp4`;
          const completeText = `\`\`\`video-url\n${proxyUrl}\n\`\`\``;
          await WorkspaceChats.new({
            workspaceId: workspace.id, prompt: message,
            response: { text: completeText, sources: [], type: chatMode, attachments: [], metrics: {} },
            threadId: thread?.id || null, user,
          });
          writeResponseChunk(response, { uuid, sources: [], type: "textResponse", textResponse: completeText, close: true, error: false });
          return;
        }
        if (s.status === "error") throw new Error(s.error || "Erreur rendu vidéo");
      }
      throw new Error("Timeout génération vidéo");
    } catch (e) {
      console.error("[Sara] Video intent error:", e.message);
      writeResponseChunk(response, {
        uuid, sources: [], type: "textResponse",
        textResponse: `❌ Impossible de générer la vidéo : ${e.message}`, close: true, error: true,
      });
      return;
    }
  }

  if (Object.keys(VALID_COMMANDS).includes(updatedMessage)) {
    const data = await VALID_COMMANDS[updatedMessage](
      workspace,
      message,
      uuid,
      user,
      thread
    );
    writeResponseChunk(response, data);
    return;
  }

  // If is agent enabled chat we will exit this flow early.
  const isAgentChat = await grepAgents({
    uuid,
    response,
    message: updatedMessage,
    user,
    workspace,
    thread,
    attachments,
  });
  if (isAgentChat) return;

  const LLMConnector = getLLMProvider({
    provider: workspace?.chatProvider,
    model: workspace?.chatModel,
  });
  const VectorDb = getVectorDbClass();

  const messageLimit = workspace?.openAiHistory || 20;
  const hasVectorizedSpace = await VectorDb.hasNamespace(workspace.slug);
  const embeddingsCount = await VectorDb.namespaceCount(workspace.slug);

  // User is trying to query-mode chat a workspace that has no data in it - so
  // we should exit early as no information can be found under these conditions.
  if ((!hasVectorizedSpace || embeddingsCount === 0) && chatMode === "query") {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse,
      sources: [],
      attachments,
      close: true,
      error: null,
    });
    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // If we are here we know that we are in a workspace that is:
  // 1. Chatting in "chat" mode and may or may _not_ have embeddings
  // 2. Chatting in "query" mode and has at least 1 embedding
  let completeText;
  let metrics = {};
  let contextTexts = [];
  let sources = [];
  let pinnedDocIdentifiers = [];
  const { rawHistory, chatHistory } = await recentChatHistory({
    user,
    workspace,
    thread,
    messageLimit,
  });

  // Look for pinned documents and see if the user decided to use this feature. We will also do a vector search
  // as pinning is a supplemental tool but it should be used with caution since it can easily blow up a context window.
  // However we limit the maximum of appended context to 80% of its overall size, mostly because if it expands beyond this
  // it will undergo prompt compression anyway to make it work. If there is so much pinned that the context here is bigger than
  // what the model can support - it would get compressed anyway and that really is not the point of pinning. It is really best
  // suited for high-context models.
  await new DocumentManager({
    workspace,
    maxTokens: LLMConnector.promptWindowLimit(),
  })
    .pinnedDocs()
    .then((pinnedDocs) => {
      pinnedDocs.forEach((doc) => {
        const { pageContent, ...metadata } = doc;
        pinnedDocIdentifiers.push(sourceIdentifier(doc));
        contextTexts.push(doc.pageContent);
        sources.push({
          text:
            pageContent.slice(0, 1_000) +
            "...continued on in source document...",
          ...metadata,
        });
      });
    });

  // Inject any parsed files for this workspace/thread/user
  const parsedFiles = await WorkspaceParsedFiles.getContextFiles(
    workspace,
    thread || null,
    user || null
  );
  parsedFiles.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    contextTexts.push(doc.pageContent);
    sources.push({
      text:
        pageContent.slice(0, 1_000) + "...continued on in source document...",
      ...metadata,
    });
  });

  // Enrichir la requête RAG avec le nom du thread pour cibler le bon sous-chapitre
  const ragInput = thread?.name
    ? `${thread.name} — ${updatedMessage}`
    : updatedMessage;

  // Filtrer le RAG sur les documents du thread si possible
  const threadDocIds = await getThreadDocIdentifiers(workspace, thread);

  const vectorSearchResults =
    embeddingsCount !== 0
      ? await VectorDb.performSimilaritySearch({
          namespace: workspace.slug,
          input: ragInput,
          LLMConnector,
          similarityThreshold: workspace?.similarityThreshold,
          topN: workspace?.topN,
          filterIdentifiers: pinnedDocIdentifiers,
          rerank: workspace?.vectorSearchMode === "rerank",
        })
      : {
          contextTexts: [],
          sources: [],
          message: null,
        };

  // Post-filter to only thread documents when available
  if (threadDocIds.length > 0 && vectorSearchResults.sources?.length > 0) {
    const indexed = vectorSearchResults.sources.map((s, i) => ({ s, i }));
    const kept = indexed.filter(({ s }) => threadDocIds.includes(sourceIdentifier(s)));
    vectorSearchResults.contextTexts = kept.map(({ i }) => vectorSearchResults.contextTexts[i]);
    vectorSearchResults.sources = kept.map(({ s }) => s);
  }

  // Failed similarity search if it was run at all and failed.
  if (!!vectorSearchResults.message) {
    writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: vectorSearchResults.message,
    });
    return;
  }

  const { fillSourceWindow } = require("../helpers/chat");
  const filledSources = fillSourceWindow({
    nDocs: workspace?.topN || 4,
    searchResults: vectorSearchResults.sources,
    history: rawHistory,
    filterIdentifiers: pinnedDocIdentifiers,
  });

  // When thread filtering is active, also exclude backfilled history sources from wrong documents
  if (threadDocIds.length > 0 && filledSources.sources?.length > 0) {
    const keptFilled = filledSources.sources.filter((s) => threadDocIds.includes(sourceIdentifier(s)));
    filledSources.sources = keptFilled;
    filledSources.contextTexts = keptFilled.map((s) => s.text);
  }

  // Why does contextTexts get all the info, but sources only get current search?
  // This is to give the ability of the LLM to "comprehend" a contextual response without
  // populating the Citations under a response with documents the user "thinks" are irrelevant
  // due to how we manage backfilling of the context to keep chats with the LLM more correct in responses.
  // If a past citation was used to answer the question - that is visible in the history so it logically makes sense
  // and does not appear to the user that a new response used information that is otherwise irrelevant for a given prompt.
  // TLDR; reduces GitHub issues for "LLM citing document that has no answer in it" while keep answers highly accurate.
  contextTexts = [...contextTexts, ...filledSources.contextTexts];
  sources = [...sources, ...vectorSearchResults.sources];

  // If in query mode and no context chunks are found from search, backfill, or pins -  do not
  // let the LLM try to hallucinate a response or use general knowledge and exit early
  if (chatMode === "query" && contextTexts.length === 0) {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse,
      sources: [],
      close: true,
      error: null,
    });

    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // Compress & Assemble message to ensure prompt passes token limit with room for response
  // and build system messages based on inputs and history.
  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt: await chatPrompt(workspace, user),
      userPrompt: updatedMessage + intentPrefix,
      contextTexts,
      chatHistory,
      attachments,
    },
    rawHistory
  );

  // If streaming is not explicitly enabled for connector
  // we do regular waiting of a response and send a single chunk.
  if (LLMConnector.streamingEnabled() !== true) {
    console.log(
      `\x1b[31m[STREAMING DISABLED]\x1b[0m Streaming is not available for ${LLMConnector.constructor.name}. Will use regular chat method.`
    );
    const { textResponse, metrics: performanceMetrics } =
      await LLMConnector.getChatCompletion(messages, {
        temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
        user: user,
      });

    completeText = textResponse;
    metrics = performanceMetrics;
    writeResponseChunk(response, {
      uuid,
      sources,
      type: "textResponseChunk",
      textResponse: completeText,
      close: true,
      error: false,
      metrics,
    });
  } else {
    const stream = await LLMConnector.streamGetChatCompletion(messages, {
      temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
      user: user,
    });
    completeText = await LLMConnector.handleStream(response, stream, {
      uuid,
      sources,
    });
    metrics = stream.metrics;
  }

  if (completeText?.length > 0) {
    const { chat } = await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: completeText,
        sources,
        type: chatMode,
        attachments,
        metrics,
      },
      threadId: thread?.id || null,
      user,
    });

    writeResponseChunk(response, {
      uuid,
      type: "finalizeResponseStream",
      close: true,
      error: false,
      chatId: chat.id,
      metrics,
    });
    return;
  }

  writeResponseChunk(response, {
    uuid,
    type: "finalizeResponseStream",
    close: true,
    error: false,
    metrics,
  });
  return;
}

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

// Retourne les filterIdentifiers des documents dont le nom de fichier contient le subchapterSlug du thread
async function getThreadDocIdentifiers(workspace, thread) {
  if (!thread?.subchapterSlug) return [];
  const keyword = normalize(thread.subchapterSlug);
  if (!keyword) return [];

  try {
    const docs = await Document.where({ workspaceId: workspace.id });
    const matched = docs.filter((d) => normalize(d.filename).includes(keyword));
    return matched.map((d) => {
      const meta = JSON.parse(d.metadata || "{}");
      return `title:${meta.title}-timestamp:${meta.published}`;
    }).filter(Boolean);
  } catch {
    return [];
  }
}


module.exports = {
  VALID_CHAT_MODE,
  streamChatWithWorkspace,
};
