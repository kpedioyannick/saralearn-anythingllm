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

const { detectIntentAndOptions, pickIntentTemplate, getUserLanguage } = require("../sara/intentDetector");
const { detectCoachIntent } = require("../sara/coachIntentDetector");
const { getCoachingContext } = require("../sara/coachingContext");
const { loadPhonoContext } = require("../sara/phonoLoader");
const { buildScheduleContextBlock } = require("../users/scheduleContext");
const { buildUserActionContext } = require("../users/userActionContext");
const { Document } = require("../../models/documents");

const VIDEO_API_URL = process.env.SARA_VIDEO_API_URL || "http://localhost:3457";
const fetch = require("node-fetch");
const { parseText2Quiz } = require("../sara/h5p/text2quizParser");
const { parseText2Book } = require("../sara/h5p/text2bookParser");
const { parseText2Flashcards } = require("../sara/h5p/text2flashcardsParser");
const { toH5pPayload } = require("../sara/h5p/toH5pParams");
const { generateH5P, generateH5PBook, generateH5PFlashcards } = require("../sara/h5p/client");

// Normalise les fences ``` mal placées que DeepSeek émet régulièrement dans
// les blocs ```probleme/```quiz, malgré les règles du template exercice :
//   1. Triple-backticks IMBRIQUÉS dans ```probleme (pseudocode encadré par
//      ``` au lieu d'indent 4 espaces) → markdown-it casse le rendu.
//   2. Bloc ouvert jamais fermé avant qu'un nouveau ```<lang> ne s'ouvre.
//   3. Bloc ouvert en fin de réponse sans close.
// Machine à état ligne par ligne, robuste aux LLMs distraits.
function normalizeRichBlocks(text) {
  if (!text || text.indexOf("```") === -1) return text;
  const lines = text.split("\n");
  const out = [];
  let inLang = null;       // bloc Sara ouvert ('quiz', 'probleme', 'dictee'...) ou null
  let nestedOpen = false;  // dans un ``` imbriqué (uniquement attendu en probleme)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (!fence) {
      out.push(nestedOpen ? "    " + line : line);
      continue;
    }
    const lang = fence[1];
    if (inLang === null) {
      out.push(line);
      if (lang) inLang = lang;
      continue;
    }
    if (lang === "") {
      // Bare ``` : close du bloc courant OU close/open d'une fence imbriquée.
      if (nestedOpen) { nestedOpen = false; continue; }
      if (inLang === "probleme") {
        // Lookahead : si la prochaine fence rencontrée est aussi bare, on est
        // sur l'OUVERTURE d'un encadré imbriqué et non sur le close de probleme.
        let isNested = false;
        for (let j = i + 1; j < lines.length; j++) {
          const f = lines[j].match(/^\s*```(\w*)\s*$/);
          if (f) { isNested = (f[1] === ""); break; }
        }
        if (isNested) { nestedOpen = true; continue; }
      }
      out.push(line);
      inLang = null;
    } else {
      // ```<lang> alors qu'un bloc est encore ouvert → le LLM a oublié le close.
      out.push("```");
      out.push("");
      out.push(line);
      inLang = lang;
    }
  }
  if (inLang !== null) out.push("```");
  return out.join("\n");
}

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
  const isCoachWorkspace = workspace?.slug === "coach-scolaire";
  const isPhonoWorkspace = workspace?.slug === "phonetique";

  let intent, intentOptions = {}, intentPrefix = "";
  let coachContextBlock = "";
  let phonoContextBlock = "";
  let forcedObjective = null;
  const userLang = getUserLanguage(user);

  if (isPhonoWorkspace) {
    // Workspace dys-phono : on charge le MD de la confusion correspondante
    // (1 thread = 1 paire) et on l'injecte dans le system prompt pour que
    // Sara ait accès au cours + aux exos prêts à l'emploi.
    const ctx = await loadPhonoContext(workspace, thread, updatedMessage);
    if (ctx) phonoContextBlock = ctx;
  }

  if (isCoachWorkspace) {
    // Coach scolaire : détecteur dédié, jamais de générateur de contenu
    // pédagogique (fiche/quiz/probleme/video/dictee/h5p). Le contexte de
    // progression (plan + goals + agrégat user_exercises) est injecté dans le
    // system prompt plus bas.
    const coach = await detectCoachIntent(updatedMessage);
    intent = coach.intent; // coach_today / coach_delays / ... / null — log/debug
    coachContextBlock = await getCoachingContext(user);
  } else {
    // Thread "Dictée" → intent dictée automatique, sinon détection par vecteurs
    const isDicteeThread = thread?.name?.toLowerCase().includes("dict");
    if (isDicteeThread) {
      intent = "dictee";
      // Thread Dictée : pas de RAG, le LLM génère le texte lui-même
      chatMode = "chat";
    } else {
      ({ intent, options: intentOptions } = await detectIntentAndOptions(updatedMessage));
    }
    intentPrefix = intent ? pickIntentTemplate(workspace, intent, thread?.name, intentOptions, userLang) : "";

    // Intent "exercice" — deux cas pour rattacher l'exo à un thread_objective :
    //   Cas 1 : l'IHM (clic ObjectiveProgress) a injecté `objectif : X` dans le
    //           message → on extrait X et on l'impose au LLM. Annotation 1:1.
    //   Cas 2 : message libre → le LLM annote `objective: <titre descriptif>` ;
    //           le serveur résout par cosine (e5-large) à l'insertion de l'exo
    //           via autoLinkExercise (cf. objectivesProgression.matchObjective).
    // Dans les deux cas on n'injecte plus la liste complète des objectifs
    // (gaspillage tokens, non scalable au-delà de ~10 objectifs).
    if (intent === "exercice") {
      const m = updatedMessage.match(/objecti(?:f|ve)\s*:\s*([^?\n]+)/i);
      forcedObjective = m ? m[1].trim().replace(/[\.\s]+$/, "") : null;
      if (forcedObjective) {
        const heading = userLang === "en"
          ? "## Imposed objective for this exercise"
          : "## Objectif imposé pour cet exercice";
        const instr = userLang === "en"
          ? `The student requests an exercise targeted on this objective. Annotate the line \`objective: ${forcedObjective}\` (verbatim copy) right after \`competence:\` in your block.`
          : `L'élève demande un exercice ciblé sur cet objectif. Annote la ligne \`objective: ${forcedObjective}\` (copie verbatim) juste après \`competence:\` dans ton bloc.`;
        intentPrefix += `\n\n${heading}\n**${forcedObjective}**\n\n${instr}\n`;
      }
    }
  }

  // Intent H5P : 3 sous-formats selon intentOptions.format
  //   - quiz (défaut) → ```quiz → N URLs h5p individuelles (multiple_choice/true_false/blanks)
  //   - book → ```book → 1 URL InteractiveBook multi-chapitres
  //   - flashcards → ```flashcards → 1 URL Flashcards
  if (intent === "generate_h5p") {
    const h5pFormat = intentOptions?.format || "quiz";
    const loaderText = h5pFormat === "book"
      ? "⏳ Génération du livre interactif…"
      : h5pFormat === "flashcards"
        ? "⏳ Génération des flashcards…"
        : "⏳ Génération du quiz interactif…";
    try {
      writeResponseChunk(response, {
        uuid, sources: [], type: "textResponse",
        textResponse: loaderText,
        close: false, error: false,
      });

      const LLMConnector = getLLMProvider({ provider: workspace?.chatProvider, model: workspace?.chatModel });
      const { textResponse: llmText } = await LLMConnector.getChatCompletion([
        { role: "system", content: await chatPrompt(workspace, null) },
        { role: "user", content: `${updatedMessage}${intentPrefix}` },
      ], { temperature: 0.5 });

      let completeText;
      if (h5pFormat === "book") {
        const { title, language, pages } = parseText2Book(llmText || "");
        if (!pages || pages.length === 0) throw new Error("Aucun chapitre exploitable dans la réponse LLM");
        const titleBase = title || thread?.name || "Livre interactif";
        const { url } = await generateH5PBook({
          title: titleBase, language: language || "fr", pages, showCoverPage: true,
        });
        completeText = `\`\`\`h5p\n${url}\n\`\`\``;
      } else if (h5pFormat === "flashcards") {
        const { title, language, description, cards } = parseText2Flashcards(llmText || "");
        if (!cards || cards.length === 0) throw new Error("Aucune carte exploitable dans la réponse LLM");
        const titleBase = title || thread?.name || "Flashcards";
        const { url } = await generateH5PFlashcards({
          title: titleBase, language: language || "fr", description, cards,
        });
        completeText = `\`\`\`h5p\n${url}\n\`\`\``;
      } else {
        const { questions, competence } = parseText2Quiz(llmText || "");
        if (questions.length === 0) throw new Error("Aucune question exploitable dans la réponse LLM");
        const titleBase = thread?.name || competence || "Quiz";
        const urls = [];
        for (let i = 0; i < questions.length; i++) {
          const payload = toH5pPayload(questions[i], userLang);
          const { url } = await generateH5P({
            ...payload,
            title: `${titleBase} — Q${i + 1}`,
            language: userLang,
          });
          urls.push(url);
        }
        completeText = urls.map((u) => `\`\`\`h5p\n${u}\n\`\`\``).join("\n\n");
      }

      await WorkspaceChats.new({
        workspaceId: workspace.id, prompt: message,
        response: { text: completeText, sources: [], type: chatMode, attachments: [], metrics: {} },
        threadId: thread?.id || null, user,
      });
      writeResponseChunk(response, {
        uuid, sources: [], type: "textResponse",
        textResponse: completeText, close: true, error: false,
      });
      return;
    } catch (e) {
      console.error("[Sara] H5P intent error:", e.message);
      writeResponseChunk(response, {
        uuid, sources: [], type: "textResponse",
        textResponse: `❌ Impossible de générer le contenu H5P (${h5pFormat}) : ${e.message}`,
        close: true, error: true,
      });
      return;
    }
  }

  // Intent vidéo : générer les slides, appeler l'API vidéo, retourner l'URL directement
  if (intent === "video") {
    // Loader visible en permanence pendant TOUT le pipeline (LLM + rendu).
    // Heartbeat toutes les 2s : sans ça, le frontend reçoit 1 chunk puis 30s de
    // silence pendant la phase LLM → il considère le message "terminé" et
    // efface le loader. Avec ce heartbeat, le DOM reste rafraîchi.
    const loaderTexts = [
      "⏳ Rendu vidéo en cours…",
      "⏳ Rendu vidéo en cours… ·",
      "⏳ Rendu vidéo en cours… · ·",
    ];
    let heartbeatI = 0;
    const sendHeartbeat = () => {
      writeResponseChunk(response, {
        uuid, sources: [], type: "textResponse",
        textResponse: loaderTexts[heartbeatI % loaderTexts.length],
        close: false, error: false,
      });
      heartbeatI++;
    };
    sendHeartbeat();
    const heartbeat = setInterval(sendHeartbeat, 2000);
    let previewHeartbeat = null;
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
      // SOURCE DE VÉRITÉ : on force format/wordByWord depuis intentOptions et
      // on ignore ce que le LLM a mis dans le JSON (DeepSeek oublie ou inverse
      // parfois ces flags). intentOptions vient de detectIntentAndOptions et
      // reflète la vraie demande user (vector-based).
      if (intentOptions?.format) payload.format = intentOptions.format;
      if (typeof intentOptions?.wordByWord === "boolean") payload.wordByWord = intentOptions.wordByWord;

      const r = await fetch(`${VIDEO_API_URL}/api/videos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { videoId } = await r.json();
      if (!videoId) throw new Error("Pas de videoId");

      // Patience active : afficher la slide 1 (titre + description) pendant le rendu
      // au lieu d'un simple spinner. Le frontend rend `video-preview` comme une carte
      // stylée. Le heartbeat ré-émet le même bloc pour empêcher le frontend de croire
      // que le stream est terminé.
      const previewBlock = "```video-preview\n" + JSON.stringify({
        videoId,
        slide1: payload.slides[0] || null,
        totalSlides: payload.slides.length,
      }) + "\n```";
      clearInterval(heartbeat);
      const sendPreview = () => {
        writeResponseChunk(response, {
          uuid, sources: [], type: "textResponse",
          textResponse: previewBlock,
          close: false, error: false,
        });
      };
      sendPreview();
      previewHeartbeat = setInterval(sendPreview, 2000);

      for (let i = 0; i < 80; i++) {
        await new Promise((res) => setTimeout(res, 3000));
        const s = await fetch(`${VIDEO_API_URL}/api/videos/${videoId}`).then((r) => r.json());
        if (s.status === "done") {
          clearInterval(previewHeartbeat);
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
      clearInterval(heartbeat);
      if (previewHeartbeat) clearInterval(previewHeartbeat);
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

  // Enrichir la requête RAG avec le nom du thread + mots-clés TF-IDF du sous-chapitre.
  // En cas 1 (objectif imposé), on préfixe l'objectif pour orienter le similarity
  // search vers les passages liés à cette sous-compétence.
  const threadKeywords = require("../sara/thread_keywords.json");
  const baseRagInput = thread?.name
    ? `${thread.name} — ${updatedMessage}`
    : updatedMessage;
  const tk = thread?.slug ? threadKeywords[thread.slug] : null;
  const objectivePrefix = forcedObjective ? `[objectif: ${forcedObjective}] ` : "";
  const ragInput = tk
    ? `${objectivePrefix}${baseRagInput} [contexte: ${tk.keywords}]`
    : `${objectivePrefix}${baseRagInput}`;

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
  const baseSystemPrompt = await chatPrompt(workspace, user);
  // Intents `planning` / `quoi_faire` : on remplace le bloc planning standard
  // par un bloc enrichi (slots scope-aware + threads assignés + objectifs).
  const isScheduleIntent = intent === "planning" || intent === "quoi_faire";
  const userActionContextBlock = isScheduleIntent
    ? await buildUserActionContext(user, intentOptions?.scope || "today")
    : null;
  const scheduleContextBlock = isScheduleIntent
    ? null
    : buildScheduleContextBlock(user);
  const composedSystemPrompt = (() => {
    let prompt = baseSystemPrompt;
    if (isCoachWorkspace) prompt = `${prompt}\n\n${coachContextBlock}`;
    if (scheduleContextBlock) prompt = `${prompt}\n\n${scheduleContextBlock}`;
    if (userActionContextBlock) prompt = `${prompt}\n\n${userActionContextBlock}`;
    return prompt;
  })();
  // Le contexte phono (MD Mazade avec exos prêts) est placé EN SUFFIXE DU USER
  // PROMPT — donc juste avant la génération du LLM. Recency bias : un bloc placé
  // loin dans le system prompt se fait écraser par l'intentPrefix et le RAG. En
  // queue de user prompt, les exos prêts à copier sont la dernière chose vue.
  const composedUserPrompt = phonoContextBlock
    ? `${updatedMessage}${intentPrefix}\n\n${phonoContextBlock}`
    : `${updatedMessage}${intentPrefix}`;
  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt: composedSystemPrompt,
      userPrompt: composedUserPrompt,
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
    // Patch les fences mal placées avant la persistance DB et l'émission finale
    // (cas typiques sur exercices : ``` imbriqués dans probleme, blocs non clos).
    const normalized = normalizeRichBlocks(completeText);
    if (normalized !== completeText) {
      writeResponseChunk(response, {
        uuid,
        sources,
        type: "textResponse",
        textResponse: normalized,
        close: false,
        error: false,
      });
      completeText = normalized;
    }

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
