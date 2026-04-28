import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  forwardRef,
} from "react";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import StatusResponse from "./StatusResponse";
import ToolApprovalRequest from "./ToolApprovalRequest";
import FileDownloadCard from "./FileDownloadCard";
import { useManageWorkspaceModal } from "../../../Modals/ManageWorkspace";
import ManageWorkspace from "../../../Modals/ManageWorkspace";
import { ArrowDown, ChartLineUp } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import debounce from "lodash.debounce";
import Chartable from "./Chartable";
import Workspace from "@/models/workspace";
import { useParams } from "react-router-dom";
import paths from "@/utils/paths";
import Appearance from "@/models/appearance";
import useTextSize from "@/hooks/useTextSize";
import useUser from "@/hooks/useUser";
import useChatHistoryScrollHandle from "@/hooks/useChatHistoryScrollHandle";
import { ThoughtExpansionProvider } from "./ThoughtContainer";
import { MessageActionsProvider } from "./MessageActionsContext";

export default forwardRef(function (
  {
    history = [],
    workspace,
    activeThread = null,
    sendCommand,
    updateHistory,
    regenerateAssistantMessage,
    websocket = null,
  },
  ref
) {
  const lastScrollTopRef = useRef(0);
  const chatHistoryRef = useRef(null);
  const { threadSlug = null } = useParams();
  const { showing, hideModal } = useManageWorkspaceModal();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const isStreaming = history[history.length - 1]?.animate;
  const { t } = useTranslation();
  const { user } = useUser();
  const { showScrollbar } = Appearance.getSettings();
  const { textSizeClass } = useTextSize();


  useEffect(() => {
    if (!isUserScrolling && (isAtBottom || isStreaming)) {
      scrollToBottom(false); // Use instant scroll for auto-scrolling
    }
  }, [history, isAtBottom, isStreaming, isUserScrolling]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isBottom = scrollHeight - scrollTop - clientHeight < 2;

    // Detect if this is a user-initiated scroll
    if (Math.abs(scrollTop - lastScrollTopRef.current) > 10) {
      setIsUserScrolling(!isBottom);
    }

    setIsAtBottom(isBottom);
    lastScrollTopRef.current = scrollTop;
  };

  const debouncedScroll = debounce(handleScroll, 100);

  useEffect(() => {
    const chatHistoryElement = chatHistoryRef.current;
    if (chatHistoryElement) {
      chatHistoryElement.addEventListener("scroll", debouncedScroll);
      return () =>
        chatHistoryElement.removeEventListener("scroll", debouncedScroll);
    }
  }, []);

  const scrollToBottom = (smooth = false) => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,

        // Smooth is on when user clicks the button but disabled during auto scroll
        // We must disable this during auto scroll because it causes issues with
        // detecting when we are at the bottom of the chat.
        ...(smooth ? { behavior: "smooth" } : {}),
      });
    }
  };

  useChatHistoryScrollHandle(ref, chatHistoryRef, {
    setIsUserScrolling,
    isStreaming,
    scrollToBottom,
  });

  const saveEditedMessage = async ({
    editedMessage,
    chatId,
    role,
    attachments = [],
    saveOnly = false,
  }) => {
    if (!editedMessage) return; // Don't save empty edits.

    // "Save" on a user message: update the prompt text without regenerating
    if (role === "user" && saveOnly) {
      const updatedHistory = [...history];
      const targetIdx = history.findIndex((msg) => msg.chatId === chatId);
      if (targetIdx < 0) return;
      updatedHistory[targetIdx].content = editedMessage;
      updateHistory(updatedHistory);
      await Workspace.updateChat(
        workspace.slug,
        threadSlug,
        chatId,
        editedMessage,
        "user"
      );
      return;
    }

    // "Submit" on a user message: auto-regenerate the response and delete all
    // messages post modified message
    if (role === "user") {
      // remove all messages after the edited message
      // technically there are two chatIds per-message pair, this will split the first.
      const updatedHistory = history.slice(
        0,
        history.findIndex((msg) => msg.chatId === chatId) + 1
      );

      // update last message in history to edited message
      updatedHistory[updatedHistory.length - 1].content = editedMessage;
      // remove all edited messages after the edited message in backend
      await Workspace.deleteEditedChats(workspace.slug, threadSlug, chatId);
      sendCommand({
        text: editedMessage,
        autoSubmit: true,
        history: updatedHistory,
        attachments,
      });
      return;
    }

    // If role is an assistant we simply want to update the comment and save on the backend as an edit.
    if (role === "assistant") {
      const updatedHistory = [...history];
      const targetIdx = history.findIndex(
        (msg) => msg.chatId === chatId && msg.role === role
      );
      if (targetIdx < 0) return;
      updatedHistory[targetIdx].content = editedMessage;
      updateHistory(updatedHistory);
      await Workspace.updateChat(
        workspace.slug,
        threadSlug,
        chatId,
        editedMessage
      );
      return;
    }
  };

  const forkThread = async (chatId) => {
    const newThreadSlug = await Workspace.forkThread(
      workspace.slug,
      threadSlug,
      chatId
    );
    window.location.href = paths.workspace.thread(
      workspace.slug,
      newThreadSlug
    );
  };

  const compiledHistory = useMemo(
    () =>
      buildMessages({
        workspace,
        history,
        activeThread,
        regenerateAssistantMessage,
        saveEditedMessage,
        forkThread,
        websocket,
        sendCommand,
      }),
    [
      workspace,
      history,
      activeThread,
      regenerateAssistantMessage,
      saveEditedMessage,
      forkThread,
      websocket,
      sendCommand,
    ]
  );
  const lastMessageInfo = useMemo(() => getLastMessageInfo(history), [history]);

  async function fetchProgress() {
    if (!activeThread?.id) return;
    const params = new URLSearchParams({
      threadId: String(activeThread.id),
      deviceId: getDeviceId(),
    });
    if (user?.id) params.set("userId", String(user.id));
    const r = await fetch(`${API_BASE}/v1/user/exercises/progress?${params.toString()}`);
    const data = await r.json();
    setProgressData(data.progress ?? []);
    setShowProgress(true);
  }

  function getSkillState(pct) {
    if (pct >= 0.7)
      return {
        label: "Acquise",
        type: "full",
        className:
          "text-emerald-200 light:text-emerald-900 bg-emerald-700/25 light:bg-emerald-200/60 border-emerald-500/35 light:border-emerald-700/25",
      };
    if (pct > 0)
      return {
        label: "En cours",
        type: "half",
        className:
          "text-amber-200 light:text-amber-900 bg-amber-700/25 light:bg-amber-200/60 border-amber-500/35 light:border-amber-700/25",
      };
    return {
      label: "Non acquise",
      type: "empty",
      className:
        "text-zinc-300 light:text-slate-700 bg-zinc-700/25 light:bg-slate-200/80 border-zinc-500/35 light:border-slate-400/40",
    };
  }
  const renderStatusResponse = useCallback(
    (item, index) => {
      const hasSubsequentMessages = index < compiledHistory.length - 1;
      return (
        <StatusResponse
          key={`status-group-${index}`}
          messages={item}
          isThinking={!hasSubsequentMessages && lastMessageInfo.isAnimating}
        />
      );
    },
    [compiledHistory.length, lastMessageInfo]
  );

  return (
    <MessageActionsProvider>
      <ThoughtExpansionProvider>
        <div
          className="hidden md:block absolute top-0 left-0 right-0 h-11 z-[25] pointer-events-none bg-white/95 border-b-2 border-emerald-500/35"
          style={{ background: "#118c4440", padding: "30px" }}
        />

        {activeThread && !showProgress && (
          <div className="fixed md:absolute top-3 md:top-5 z-[120] md:z-30 right-[102px] md:right-[107px]">
            <button
              type="button"
              onClick={fetchProgress}
              className="uppercase transition-all duration-300 w-[35px] h-[35px] text-base font-semibold rounded-full flex items-center bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover justify-center text-white p-2 hover:border-slate-100 hover:border-opacity-50 border-transparent border"
              title={t("sara.progress.button_title")}
            >
              <ChartLineUp size={16} weight="bold" />
            </button>
          </div>
        )}

        {showProgress && (
          <>
            <div
              className="fixed inset-0 z-[120] bg-black/35 backdrop-blur-[1px] md:hidden"
              onClick={() => setShowProgress(false)}
            />
            <div className="fixed md:absolute top-16 md:top-0 right-0 z-[130] h-[calc(100%-4rem)] md:h-full w-[86vw] max-w-72 bg-zinc-900/98 light:bg-white border-l border-white/10 light:border-gray-200 flex flex-col shadow-2xl">
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b-2 border-emerald-500/30 bg-theme-action-menu-bg/85 light:bg-white">
              <p className="text-white light:text-gray-800 text-sm font-semibold whitespace-normal break-words leading-snug">
                {activeThread?.name}
              </p>
              <button
                onClick={() => setShowProgress(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors border border-white/20"
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!progressData || progressData.length === 0 ? (
                <p className="text-white/50 text-sm text-center mt-8">{t("sara.progress.empty")}</p>
              ) : (
                <div className="space-y-4">
                  {progressData.map((group) => {
                    const pct = group.total > 0 ? group.correct / group.total : 0;
                    const skillState = getSkillState(pct);
                    return (
                      <div key={group.competence} className="bg-white/5 light:bg-gray-100 rounded-xl p-3">
                        <div className="flex items-start gap-2 pr-2 min-w-0 mb-2">
                            <span
                              className={`relative mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border ${
                                skillState.type === "full"
                                  ? "bg-emerald-500 border-emerald-400"
                                  : skillState.type === "half"
                                    ? "border-amber-400 bg-transparent"
                                    : "border-zinc-400 bg-transparent light:border-slate-500"
                              }`}
                            >
                              {skillState.type === "half" && (
                                <span className="absolute left-0 top-0 h-full w-1/2 rounded-l-[2px] bg-amber-400" />
                              )}
                            </span>
                            <p className="text-white/90 light:text-gray-800 text-xs font-semibold leading-tight break-words">
                              {group.competence}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 light:bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                          </div>
                          <span className="text-white/70 light:text-gray-600 text-xs font-mono shrink-0">
                            {group.correct}/{group.total}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex ${skillState.className}`}
                          >
                            <span className="md:hidden">
                              {skillState.label === "Non acquise"
                                ? "Non"
                                : skillState.label}
                            </span>
                            <span className="hidden md:inline">
                              {skillState.label}
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              setShowProgress(false);
                              sendCommand({ text: `${t("sara.progress.retry_prompt")} : ${group.competence}`, autoSubmit: true });
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 light:text-emerald-700 transition-colors"
                          >
                            🔁 {t("sara.progress.retry")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </>
        )}

        <div
          className={`markdown text-white/80 light:text-theme-text-primary font-light ${textSizeClass} h-full md:h-[83%] pb-[100px] pt-16 md:pt-12 md:pb-20 md:mx-0 overflow-y-scroll flex flex-col items-center justify-start ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
          id="chat-history"
          ref={chatHistoryRef}
          onScroll={handleScroll}
        >
          <div className="w-full">
            {compiledHistory.map((item, index) =>
              Array.isArray(item) ? renderStatusResponse(item, index) : item
            )}
          </div>
          {showing && (
            <ManageWorkspace
              hideModal={hideModal}
              providedSlug={workspace.slug}
            />
          )}
        </div>
        {!isAtBottom && (
          <div className="absolute bottom-40 right-10 z-50 cursor-pointer animate-pulse">
            <div className="flex flex-col items-center">
              <div
                className="p-1 rounded-full border border-white/10 bg-white/10 hover:bg-white/20 hover:text-white"
                onClick={() => {
                  scrollToBottom(isStreaming ? false : true);
                  setIsUserScrolling(false);
                }}
              >
                <ArrowDown weight="bold" className="text-white/60 w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </ThoughtExpansionProvider>
    </MessageActionsProvider>
  );
});

const getLastMessageInfo = (history) => {
  const lastMessage = history?.[history.length - 1] || {};
  return {
    isAnimating: lastMessage?.animate,
    isStatusResponse: lastMessage?.type === "statusResponse",
  };
};

/**
 * Builds the history of messages for the chat.
 * This is mostly useful for rendering the history in a way that is easy to understand.
 * as well as compensating for agent thinking and other messages that are not part of the history, but
 * are still part of the chat.
 *
 * @param {Object} param0 - The parameters for building the messages.
 * @param {Array} param0.history - The history of messages.
 * @param {Object} param0.workspace - The workspace object.
 * @param {Function} param0.regenerateAssistantMessage - The function to regenerate the assistant message.
 * @param {Function} param0.saveEditedMessage - The function to save the edited message.
 * @param {Function} param0.forkThread - The function to fork the thread.
 * @param {WebSocket} param0.websocket - The active websocket connection for agent communication.
 * @returns {Array} The compiled history of messages.
 */
function buildMessages({
  history,
  workspace,
  activeThread,
  regenerateAssistantMessage,
  saveEditedMessage,
  forkThread,
  websocket,
  sendCommand,
}) {
  return history.reduce((acc, props, index) => {
    const isLastBotReply =
      index === history.length - 1 && props.role === "assistant";

    if (props?.type === "statusResponse" && !!props.content) {
      if (acc.length > 0 && Array.isArray(acc[acc.length - 1])) {
        acc[acc.length - 1].push(props);
      } else {
        acc.push([props]);
      }
      return acc;
    }

    if (props.type === "toolApprovalRequest") {
      acc.push(
        <ToolApprovalRequest
          key={`tool-approval-${props.requestId}`}
          requestId={props.requestId}
          skillName={props.skillName}
          payload={props.payload}
          description={props.description}
          timeoutMs={props.timeoutMs}
          websocket={websocket}
        />
      );
      return acc;
    }

    if (props.type === "rechartVisualize" && !!props.content) {
      acc.push(<Chartable key={props.uuid} props={props} />);
    } else if (props.type === "fileDownloadCard" && !!props.content) {
      acc.push(<FileDownloadCard key={props.uuid} props={props} />);
    } else if (isLastBotReply && props.animate) {
      acc.push(
        <PromptReply
          key={`prompt-reply-${props.uuid || index}`}
          uuid={props.uuid}
          reply={props.content}
          pending={props.pending}
          sources={props.sources}
          error={props.error}
          closed={props.closed}
          workspace={workspace}
          activeThread={activeThread}
        />
      );
    } else {
      acc.push(
        <HistoricalMessage
          // Key stable basée sur l'identité du message (DB chatId pour les
          // messages chargés depuis l'historique, uuid pour les messages
          // venant juste de finir de streamer). Empêche le remount/perte
          // d'état des QuizBlock/ProblemeBlock/DicteeBlock quand un nouveau
          // message en cours de streaming décale la liste des messages.
          key={`hm-${props.chatId ?? props.uuid ?? index}`}
          uuid={props.uuid}
          message={props.content}
          role={props.role}
          workspace={workspace}
          activeThread={activeThread}
          sources={props.sources}
          feedbackScore={props.feedbackScore}
          chatId={props.chatId}
          error={props.error}
          attachments={props.attachments}
          regenerateMessage={regenerateAssistantMessage}
          isLastMessage={isLastBotReply}
          saveEditedMessage={saveEditedMessage}
          forkThread={forkThread}
          metrics={props.metrics}
          outputs={props.outputs}
          sendCommand={sendCommand}
        />
      );
    }
    return acc;
  }, []);
}
