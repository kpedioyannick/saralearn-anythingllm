import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import { useModal } from "@/hooks/useModal";
import LLMSelectorModal from "../PromptInput/LLMSelector/index";
import SetupProvider from "../PromptInput/LLMSelector/SetupProvider";
import {
  SAVE_LLM_SELECTOR_EVENT,
  PROVIDER_SETUP_EVENT,
} from "../PromptInput/LLMSelector/action";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import { SIDEBAR_TOGGLE_EVENT } from "@/components/Sidebar/SidebarToggle";

function fetchWorkspaceInfo(slug, setWorkspaceName) {
  if (!slug) return;
  Workspace.bySlug(slug).then((workspace) => {
    setWorkspaceName(workspace?.name || "");
  });
}

export default function WorkspaceModelPicker({ workspaceSlug = null, activeThread = null }) {
  const { t } = useTranslation();
  const { slug: urlSlug } = useParams();
  const slug = urlSlug ?? workspaceSlug;
  const { user } = useUser();
  const isAdmin = !user || user.role === "admin";
  const [showSelector, setShowSelector] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const {
    isOpen: isSetupProviderOpen,
    openModal: openSetupProviderModal,
    closeModal: closeSetupProviderModal,
  } = useModal();
  const [config, setConfig] = useState({ settings: {}, provider: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.localStorage.getItem("anythingllm_sidebar_toggle") !== "closed"
  );

  useEffect(() => {
    const handleToggle = (e) => setSidebarOpen(e.detail.open);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
  }, []);

  // Fetch current workspace name for display (avant: nom du LLM type
  // "deepseek-chat" → inutile et risqué côté élève. On garde le click pour
  // ouvrir le LLM selector mais uniquement pour les admins).
  useEffect(() => fetchWorkspaceInfo(slug, setWorkspaceName), [slug]);

  // Close selector and refresh workspace name when LLM is saved (admin path)
  useEffect(() => {
    function handleSave() {
      setShowSelector(false);
      fetchWorkspaceInfo(slug, setWorkspaceName);
    }
    window.addEventListener(SAVE_LLM_SELECTOR_EVENT, handleSave);
    return () =>
      window.removeEventListener(SAVE_LLM_SELECTOR_EVENT, handleSave);
  }, [slug]);

  // Handle provider setup request
  useEffect(() => {
    function handleProviderSetup(e) {
      const { provider, settings } = e.detail;
      setConfig({ settings, provider });
      setTimeout(() => openSetupProviderModal(), 300);
    }
    window.addEventListener(PROVIDER_SETUP_EVENT, handleProviderSetup);
    return () =>
      window.removeEventListener(PROVIDER_SETUP_EVENT, handleProviderSetup);
  }, []);

  if (!slug) return null;

  return (
    <>
      {showSelector && isAdmin && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowSelector(false)}
        />
      )}
      <div
        className={`hidden md:block absolute top-2 z-30 transition-all duration-500 ${
          sidebarOpen ? "left-3" : "left-11"
        }`}
      >
        <button
          type="button"
          onClick={() => isAdmin && setShowSelector(!showSelector)}
          // Élève (non-admin) → bouton non interactif (just info). Admin →
          // toggle LLM selector. cursor-default empêche le hover-styling
          // d'apparaître pour les élèves.
          className={`group border-none px-2.5 py-1 flex flex-col items-start rounded-lg transition-all leading-tight ${
            isAdmin ? "cursor-pointer" : "cursor-default"
          } ${
            showSelector && isAdmin
              ? "bg-zinc-700 light:bg-slate-200"
              : isAdmin
                ? "hover:bg-zinc-700 light:hover:bg-slate-200"
                : ""
          }`}
        >
          <span
            className={`text-xs font-semibold ${
              showSelector && isAdmin
                ? "text-white light:text-slate-800"
                : "text-zinc-200 light:text-slate-700 group-hover:text-white light:group-hover:text-slate-800"
            }`}
          >
            {workspaceName || t("new-workspace.placeholder", "Workspace")}
          </span>
          {activeThread?.name && (
            <span
              className={`text-[10px] font-normal mt-0.5 max-w-[260px] truncate ${
                showSelector && isAdmin
                  ? "text-zinc-300 light:text-slate-500"
                  : "text-zinc-400 light:text-slate-500"
              }`}
              title={activeThread.name}
            >
              🧵 {activeThread.name}
            </span>
          )}
        </button>

        {showSelector && isAdmin && (
          <div className="absolute left-0 top-full mt-1 bg-zinc-800 light:bg-white border border-zinc-700 light:border-slate-300 rounded-xl shadow-lg w-[620px] overflow-hidden">
            <LLMSelectorModal
              key={refreshKey}
              workspaceSlug={slug}
              initialProvider={config.provider?.value}
            />
          </div>
        )}
      </div>

      <SetupProvider
        isOpen={isSetupProviderOpen}
        closeModal={closeSetupProviderModal}
        postSubmit={() => {
          closeSetupProviderModal();
          setRefreshKey((k) => k + 1);
        }}
        settings={config.settings}
        llmProvider={config.provider}
      />
    </>
  );
}
