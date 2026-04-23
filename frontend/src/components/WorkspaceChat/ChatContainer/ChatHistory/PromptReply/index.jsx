/* eslint-disable react-hooks/refs */
import { memo, useRef, useEffect } from "react";
import { Warning } from "@phosphor-icons/react";
import { API_BASE } from "@/utils/constants";
import { getDeviceId } from "@/utils/deviceId";
import Citations from "../Citation";
import RichMessageRenderer from "@/components/WorkspaceChat/RichMessageRenderer";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
} from "../ThoughtContainer";

const PromptReply = ({ uuid, reply, pending, error, sources = [], workspace = null, activeThread = null }) => {
  if (!reply && sources.length === 0 && !pending && !error) return null;

  if (pending) {
    return (
      <div className="flex justify-start w-full">
        <div className="py-4 pl-0 pr-4 flex flex-col md:max-w-[80%]">
          <div className="mt-3 ml-1 dot-falling light:invert"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-start w-full">
        <div className="py-4 pl-0 pr-4 flex flex-col md:max-w-[80%]">
          <span className="inline-block p-2 rounded-lg bg-red-50 text-red-500">
            <Warning className="h-4 w-4 mb-1 inline-block" /> Could not respond
            to message.
            <span className="text-xs">Reason: {error || "unknown"}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div key={uuid} className="flex justify-start w-full">
      <div className="py-4 pl-0 pr-4 flex flex-col w-full">
        <div className="break-words rounded-[16px] border border-[rgba(74,222,128,0.22)] light:border-[rgba(17,140,68,0.22)] bg-[rgba(17,140,68,0.08)] light:bg-white px-3 py-3 md:px-4 md:py-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold tracking-wide uppercase text-emerald-300 light:text-emerald-800">
              Sara AI
            </p>
          </div>
          <RenderAssistantChatContent
            key={`${uuid}-prompt-reply-content`}
            message={reply}
            messageId={uuid}
            workspace={workspace}
            activeThread={activeThread}
          />
          <div className="mt-2 pt-2 border-t border-white/10 light:border-[rgba(17,140,68,0.2)]">
            <Citations sources={sources} />
          </div>
        </div>
      </div>
    </div>
  );
};

function RenderAssistantChatContent({ message, messageId, workspace, activeThread }) {
  const contentRef = useRef("");
  const thoughtChainRef = useRef(null);

  useEffect(() => {
    const thinking =
      message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);

    if (thinking && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(message);
      return;
    }

    const completeThoughtChain = message.match(THOUGHT_REGEX_COMPLETE)?.[0];
    const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");

    if (completeThoughtChain && thoughtChainRef.current) {
      thoughtChainRef.current.updateContent(completeThoughtChain);
    }

    contentRef.current = msgToRender;
  }, [message]);

  const thinking =
    message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE);
  if (thinking)
    return (
      <ThoughtChainComponent
        ref={thoughtChainRef}
        content=""
        messageId={messageId}
      />
    );

  return (
    <div className="flex flex-col gap-y-1">
      {message.match(THOUGHT_REGEX_COMPLETE) && (
        <ThoughtChainComponent
          ref={thoughtChainRef}
          content=""
          messageId={messageId}
        />
      )}
      <RichMessageRenderer
        message={contentRef.current}
        workspace={workspace}
        activeThread={activeThread}
      />
    </div>
  );
}

export default memo(PromptReply);
