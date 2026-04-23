import React, { memo, useState } from "react";
import useCopyText from "@/hooks/useCopyText";
import { Check, ThumbsUp, ArrowsClockwise, Copy } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import { EditMessageAction } from "./EditMessage";
import RenderMetrics from "./RenderMetrics";
import ActionMenu from "./ActionMenu";
import { useTranslation } from "react-i18next";

const Actions = ({
  message,
  feedbackScore,
  chatId,
  slug,
  isLastMessage,
  regenerateMessage,
  forkThread,
  isEditing,
  role,
  metrics = {},
}) => {
  const { t } = useTranslation();
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackScore);
  const handleFeedback = async (newFeedback) => {
    const updatedFeedback =
      selectedFeedback === newFeedback ? null : newFeedback;
    await Workspace.updateChatFeedback(chatId, slug, updatedFeedback);
    setSelectedFeedback(updatedFeedback);
  };

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-y-0.5 ${role === "user" ? "justify-end" : "justify-between"}`}
    >
      <div className="flex justify-start items-center gap-x-1.5">
        <div className="md:group-hover:opacity-100 transition-all duration-300 md:opacity-0 flex justify-start items-center gap-x-1.5">
          <div
            className={`flex justify-start items-center gap-x-1.5 ${role === "user" ? "flex-row-reverse" : ""}`}
          >
            <CopyMessage message={message} />
            <EditMessageAction
              chatId={chatId}
              role={role}
              isEditing={isEditing}
            />
          </div>
          {isLastMessage && !isEditing && (
            <RegenerateMessage
              regenerateMessage={regenerateMessage}
              slug={slug}
              chatId={chatId}
            />
          )}
          {chatId && role !== "user" && !isEditing && (
            <FeedbackButton
              isSelected={selectedFeedback === true}
              handleFeedback={() => handleFeedback(true)}
              tooltipId="feedback-button"
              tooltipContent={t("chat_window.good_response")}
              IconComponent={ThumbsUp}
            />
          )}
          <ActionMenu
            chatId={chatId}
            forkThread={forkThread}
            isEditing={isEditing}
            role={role}
          />
        </div>
      </div>
      <RenderMetrics metrics={metrics} />
    </div>
  );
};

function FeedbackButton({
  isSelected,
  handleFeedback,
  tooltipContent,
  IconComponent,
}) {
  return (
    <div className="relative">
      <button
        onClick={handleFeedback}
        data-tooltip-id="feedback-button"
        data-tooltip-content={tooltipContent}
        className={`h-7 w-7 rounded-md border border-transparent flex items-center justify-center transition-colors ${
          isSelected
            ? "text-emerald-200 bg-emerald-700/35 border-emerald-500/40 light:text-emerald-900 light:bg-emerald-300/40"
            : "text-zinc-300 light:text-slate-500 hover:text-emerald-200 hover:bg-emerald-700/20 light:hover:text-emerald-900 light:hover:bg-emerald-200/50"
        }`}
        aria-label={tooltipContent}
      >
        <IconComponent
          size={16}
          weight={isSelected ? "fill" : "regular"}
        />
      </button>
    </div>
  );
}

function CopyMessage({ message }) {
  const { copied, copyText } = useCopyText();
  const { t } = useTranslation();

  return (
    <>
      <div className="relative">
        <button
          onClick={() => copyText(message)}
          data-tooltip-id="copy-assistant-text"
          data-tooltip-content={t("chat_window.copy")}
          className={`h-7 w-7 rounded-md border border-transparent flex items-center justify-center transition-colors ${
            copied
              ? "text-emerald-100 bg-emerald-700/35 border-emerald-500/40 light:text-emerald-900 light:bg-emerald-300/40"
              : "text-zinc-300 light:text-slate-500 hover:text-emerald-200 hover:bg-emerald-700/20 light:hover:text-emerald-900 light:hover:bg-emerald-200/50"
          }`}
          aria-label={t("chat_window.copy")}
        >
          {copied ? (
            <Check size={16} />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
    </>
  );
}

function RegenerateMessage({ regenerateMessage, chatId }) {
  const { t } = useTranslation();
  if (!chatId) return null;
  return (
    <div className="relative">
      <button
        onClick={() => regenerateMessage(chatId)}
        data-tooltip-id="regenerate-assistant-text"
        data-tooltip-content={t("chat_window.regenerate_response")}
        className="h-7 w-7 rounded-md border border-transparent text-zinc-300 light:text-slate-500 flex items-center justify-center transition-colors hover:text-emerald-200 hover:bg-emerald-700/20 light:hover:text-emerald-900 light:hover:bg-emerald-200/50"
        aria-label={t("chat_window.regenerate")}
      >
        <ArrowsClockwise size={16} weight="fill" />
      </button>
    </div>
  );
}

export default memo(Actions);
