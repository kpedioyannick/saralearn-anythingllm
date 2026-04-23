import React, { useEffect, useState } from "react";
import { default as WorkspaceChatContainer } from "@/components/WorkspaceChat";
import Sidebar from "@/components/Sidebar";
import { useParams, useNavigate } from "react-router-dom";
import Workspace from "@/models/workspace";
import WorkspaceThread from "@/models/workspaceThread";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { isMobile } from "react-device-detect";
import { FullScreenLoader } from "@/components/Preloader";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";

export default function WorkspaceChat() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;
  }

  return <ShowWorkspaceChat />;
}

function ShowWorkspaceChat() {
  const { slug, threadSlug } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getWorkspace() {
      if (!slug) return;
      const _workspace = await Workspace.bySlug(slug);
      if (!_workspace) return setLoading(false);

      // Redirect to first thread if no thread is selected
      if (!threadSlug) {
        const { threads } = await WorkspaceThread.all(slug);
        if (threads?.length > 0) {
          navigate(`/workspace/${slug}/t/${threads[0].slug}`, { replace: true });
          return;
        }
      }

      const [suggestedMessages, { showAgentCommand }] = await Promise.all([
        Workspace.getSuggestedMessages(slug),
        Workspace.agentCommandAvailable(slug),
      ]);
      setWorkspace({
        ..._workspace,
        suggestedMessages,
        showAgentCommand,
      });
      setLoading(false);
      localStorage.setItem(
        LAST_VISITED_WORKSPACE,
        JSON.stringify({
          slug: _workspace.slug,
          name: _workspace.name,
        })
      );
    }
    getWorkspace();
  }, [slug, threadSlug]);

  return (
    <>
      <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex">
        {!isMobile && <Sidebar />}
        <WorkspaceChatContainer loading={loading} workspace={workspace} />
      </div>
    </>
  );
}
