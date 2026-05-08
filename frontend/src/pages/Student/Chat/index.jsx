import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Workspace from "@/models/workspace";
import { default as WorkspaceChatContainer } from "@/components/WorkspaceChat";
import StudentLayout from "@/components/StudentLayout";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";

export default function StudentChat() {
  const { loading: pwLoading, requiresAuth, mode } = usePasswordModal();
  if (pwLoading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;
  }
  return <ShowStudentChat />;
}

function ShowStudentChat() {
  const { slug, threadSlug } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getWorkspace() {
      if (!slug) return;
      const ws = await Workspace.bySlug(slug);
      if (!ws) {
        navigate(paths.student.home(), { replace: true });
        return;
      }
      const [suggestedMessages, { showAgentCommand }] = await Promise.all([
        Workspace.getSuggestedMessages(slug),
        Workspace.agentCommandAvailable(slug),
      ]);
      setWorkspace({ ...ws, suggestedMessages, showAgentCommand });
      setLoading(false);
    }
    getWorkspace();
  }, [slug, navigate]);

  return (
    <StudentLayout
      title={workspace?.name}
      backTo={paths.student.subject(slug)}
      fullBleed
    >
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <WorkspaceChatContainer
          loading={loading}
          workspace={workspace}
          studentMode
        />
      </div>
    </StudentLayout>
  );
}
