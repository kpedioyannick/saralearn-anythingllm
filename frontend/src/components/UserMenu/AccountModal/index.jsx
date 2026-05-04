import { useLanguageOptions } from "@/hooks/useLanguageOptions";
import usePfp from "@/hooks/usePfp";
import System from "@/models/system";
import Appearance from "@/models/appearance";
import Workspace from "@/models/workspace";
import WorkspaceThread from "@/models/workspaceThread";
import { AUTH_USER } from "@/utils/constants";
import showToast from "@/utils/toast";
import { Info, Plus, Star, Trash, X } from "@phosphor-icons/react";
import ReactDOM from "react-dom";
import { useTheme } from "@/hooks/useTheme";
import useAssignedThreads from "@/hooks/useAssignedThreads";
import ScheduleSection from "./ScheduleSection";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tooltip } from "react-tooltip";
import { safeJsonParse } from "@/utils/request";
import Toggle from "@/components/lib/Toggle";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/utils/username";

const SHEET_ANIM_MS = 280;

export default function AccountModal({ user, hideModal, initialSection = null }) {
  const { pfp, setPfp } = usePfp();
  const { t } = useTranslation();
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!entered || !initialSection) return;
    const target = document.getElementById(`space-section-${initialSection}`);
    if (target && scrollRef.current) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [entered, initialSection]);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => hideModal?.(), SHEET_ANIM_MS);
  }, [hideModal]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return false;

    const formData = new FormData();
    formData.append("file", file);
    const { success, error } = await System.uploadPfp(formData);
    if (!success) {
      showToast(t("profile_settings.failed_upload", { error }), "error");
      return;
    }

    const pfpUrl = await System.fetchPfp(user.id);
    setPfp(pfpUrl);
    showToast(t("profile_settings.upload_success"), "success");
  };

  const handleRemovePfp = async () => {
    const { success, error } = await System.removePfp();
    if (!success) {
      showToast(t("profile_settings.failed_remove", { error }), "error");
      return;
    }

    setPfp(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) {
      if (!value || value === null) continue;
      data[key] = value;
    }

    const { success, error } = await System.updateUser(data);
    if (success) {
      let storedUser = safeJsonParse(localStorage.getItem(AUTH_USER), null);
      if (storedUser) {
        storedUser.username = data.username;
        storedUser.bio = data.bio;
        localStorage.setItem(AUTH_USER, JSON.stringify(storedUser));
      }
      showToast(t("profile_settings.profile_updated"), "success", {
        clear: true,
      });
      requestClose();
    } else {
      showToast(t("profile_settings.failed_update_user", { error }), "error");
    }
  };

  const visible = entered && !closing;

  const sheet = (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-sheet-title"
    >
      <div
        className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 z-10 flex h-full w-[90%] max-w-[680px] flex-col overflow-hidden border-l border-theme-modal-border bg-theme-bg-secondary shadow-2xl shadow-black/50 transform transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 p-6 border-b border-theme-modal-border">
          <div className="w-full flex gap-x-2 items-center">
            <h3
              id="account-sheet-title"
              className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap"
            >
              Mon espace
            </h3>
          </div>
          <button
            onClick={requestClose}
            type="button"
            className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
          >
            <X size={24} weight="bold" className="text-white" />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleUpdate} className="flex flex-col">
            <section
              id="space-section-schedule"
              className="px-6 pt-6 scroll-mt-4"
            >
              <ScheduleSection />
            </section>

            <section
              id="space-section-favorites"
              className="px-6 scroll-mt-4"
            >
              <AssignedThreadsSection />
            </section>

            <section
              id="space-section-profile"
              className="px-6 mt-6 pt-6 border-t border-theme-modal-border scroll-mt-4"
            >
              <h4 className="text-sm font-semibold text-white mb-4">
                Mon profil
              </h4>
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex flex-col items-center md:items-start shrink-0">
                  <label className="group w-32 h-32 flex flex-col items-center justify-center bg-theme-bg-primary hover:bg-theme-bg-secondary transition-colors duration-300 rounded-full border-2 border-dashed border-white light:border-[#686C6F] light:bg-[#E0F2FE] light:hover:bg-transparent cursor-pointer hover:opacity-60">
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {pfp ? (
                      <img
                        src={pfp}
                        alt="User profile picture"
                        className="w-32 h-32 rounded-full object-cover bg-white"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2">
                        <Plus className="w-6 h-6 text-theme-text-secondary" />
                        <span className="text-theme-text-secondary text-opacity-80 text-xs font-semibold mt-1">
                          {t("profile_settings.profile_picture")}
                        </span>
                      </div>
                    )}
                  </label>
                  {pfp && (
                    <button
                      type="button"
                      onClick={handleRemovePfp}
                      className="mt-2 text-theme-text-secondary text-opacity-60 text-xs font-medium hover:underline"
                    >
                      {t("profile_settings.remove_profile_picture")}
                    </button>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-y-4 w-full">
                  <div>
                    <label
                      htmlFor="username"
                      className="block mb-2 text-sm font-medium text-theme-text-primary"
                    >
                      {t("profile_settings.username")}
                    </label>
                    <input
                      name="username"
                      type="text"
                      className="border-none bg-theme-settings-input-bg placeholder:text-theme-settings-input-placeholder border-gray-500 text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder="User's username"
                      minLength={USERNAME_MIN_LENGTH}
                      maxLength={USERNAME_MAX_LENGTH}
                      pattern={USERNAME_PATTERN}
                      defaultValue={user.username}
                      required
                      autoComplete="off"
                    />
                    <p className="mt-2 text-xs text-white/60">
                      {t("common.username_requirements")}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block mb-2 text-sm font-medium text-white"
                    >
                      {t("profile_settings.new_password")}
                    </label>
                    <input
                      name="password"
                      type="text"
                      className="border-none bg-theme-settings-input-bg placeholder:text-theme-settings-input-placeholder border-gray-500 text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
                      placeholder={`${user.username}'s new password`}
                      minLength={8}
                    />
                    <p className="mt-2 text-xs text-white/60">
                      {t("profile_settings.password_description")}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="bio"
                      className="block mb-2 text-sm font-medium text-white"
                    >
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      className="border-none bg-theme-settings-input-bg placeholder:text-theme-settings-input-placeholder border-gray-500 text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 min-h-[80px] resize-y"
                      placeholder="Tell us about yourself..."
                      defaultValue={user.bio}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              id="space-section-preferences"
              className="px-6 mt-6 pt-6 border-t border-theme-modal-border scroll-mt-4"
            >
              <h4 className="text-sm font-semibold text-white mb-4">
                Préférences
              </h4>
              <div className="flex flex-wrap gap-x-16 gap-y-6">
                <div className="flex flex-col gap-y-6">
                  <ThemePreference />
                  <LanguagePreference />
                </div>
                <div className="flex flex-col gap-y-6">
                  <AutoSubmitPreference />
                  <AutoSpeakPreference />
                </div>
              </div>
            </section>

            <div className="sticky bottom-0 mt-6 flex justify-between items-center border-t border-theme-modal-border bg-theme-bg-secondary p-4">
              <button
                onClick={requestClose}
                type="button"
                className="transition-all duration-300 text-white hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
              >
                {t("profile_settings.cancel")}
              </button>
              <button
                type="submit"
                className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
              >
                {t("profile_settings.update_account")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(sheet, document.body);
}

function LanguagePreference() {
  const {
    currentLanguage,
    supportedLanguages,
    getLanguageName,
    changeLanguage,
  } = useLanguageOptions();
  const { t } = useTranslation();
  return (
    <div>
      <label
        htmlFor="userLang"
        className="block mb-2 text-sm font-medium text-white"
      >
        {t("profile_settings.language")}
      </label>
      <select
        name="userLang"
        className="border-none bg-theme-settings-input-bg w-fit mt-2 px-4 focus:outline-primary-button active:outline-primary-button outline-none text-white text-sm rounded-lg block py-2"
        defaultValue={currentLanguage || "en"}
        onChange={(e) => changeLanguage(e.target.value)}
      >
        {supportedLanguages.map((lang) => {
          return (
            <option key={lang} value={lang}>
              {getLanguageName(lang)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ThemePreference() {
  const { theme, setTheme, availableThemes } = useTheme();
  const { t } = useTranslation();
  return (
    <div>
      <label
        htmlFor="theme"
        className="block mb-2 text-sm font-medium text-white"
      >
        {t("profile_settings.theme")}
      </label>
      <select
        name="theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="border-none bg-theme-settings-input-bg w-fit px-4 focus:outline-primary-button active:outline-primary-button outline-none text-white text-sm rounded-lg block py-2"
      >
        {Object.entries(availableThemes).map(([key, value]) => (
          <option key={key} value={key}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}

function AutoSubmitPreference() {
  const [autoSubmitSttInput, setAutoSubmitSttInput] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const settings = Appearance.getSettings();
    setAutoSubmitSttInput(settings.autoSubmitSttInput ?? true);
  }, []);

  const handleChange = (checked) => {
    setAutoSubmitSttInput(checked);
    Appearance.updateSettings({ autoSubmitSttInput: checked });
  };

  return (
    <div>
      <div className="flex items-center gap-x-1 mb-2">
        <label
          htmlFor="autoSubmit"
          className="block text-sm font-medium text-white"
        >
          {t("customization.chat.auto_submit.title")}
        </label>
        <div
          data-tooltip-id="auto-submit-info"
          data-tooltip-content={t("customization.chat.auto_submit.description")}
          className="cursor-pointer h-fit"
        >
          <Info size={16} weight="bold" className="text-white" />
        </div>
      </div>
      <Toggle size="lg" enabled={autoSubmitSttInput} onChange={handleChange} />
      <Tooltip
        id="auto-submit-info"
        place="bottom"
        delayShow={300}
        className="allm-tooltip !allm-text-xs"
      />
    </div>
  );
}

function AssignedThreadsSection() {
  const { assignedThreads, assign, unassign, refresh } = useAssignedThreads();
  const [workspaces, setWorkspaces] = useState([]);
  const [pickerWorkspace, setPickerWorkspace] = useState("");
  const [pickerThreads, setPickerThreads] = useState([]);
  const [pickerThread, setPickerThread] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Workspace.all().then((ws) => setWorkspaces(ws || []));
    refresh();
  }, []);

  useEffect(() => {
    if (!pickerWorkspace) {
      setPickerThreads([]);
      setPickerThread("");
      return;
    }
    WorkspaceThread.all(pickerWorkspace).then(({ threads }) => {
      const list = (threads || []).filter((t) => !!t.slug && !t.deleted);
      setPickerThreads(list);
      setPickerThread(list[0]?.slug || "");
    });
  }, [pickerWorkspace]);

  const handleAdd = async () => {
    if (!pickerWorkspace || !pickerThread) return;
    setAdding(true);
    const ws = workspaces.find((w) => w.slug === pickerWorkspace);
    const th = pickerThreads.find((t) => t.slug === pickerThread);
    const ok = await assign(
      pickerWorkspace,
      pickerThread,
      th?.name,
      ws?.name
    );
    setAdding(false);
    if (!ok) {
      showToast("Impossible d'ajouter ce thread", "error", { clear: true });
      return;
    }
    showToast("Thread ajouté à tes assignés", "success", { clear: true });
  };

  const handleRemove = async (workspaceSlug, threadSlug) => {
    const ok = await unassign(workspaceSlug, threadSlug);
    if (!ok) showToast("Impossible de retirer ce thread", "error", { clear: true });
  };

  // Threads still available to add (not already assigned)
  const availableInWorkspace = pickerThreads.filter(
    (t) =>
      !assignedThreads.some(
        (a) => a.workspaceSlug === pickerWorkspace && a.threadSlug === t.slug
      )
  );

  return (
    <div className="mt-2 pt-6 border-t border-theme-modal-border">
      <div className="flex items-center gap-x-2 mb-3">
        <Star size={18} weight="fill" className="text-yellow-400" />
        <h4 className="text-sm font-semibold text-white">
          Mes threads assignés
        </h4>
      </div>
      <p className="text-xs text-white/60 mb-3">
        Tes threads favoris sont mis en évidence dans la barre latérale.
      </p>

      {assignedThreads.length === 0 ? (
        <p className="text-sm text-white/50 italic mb-4">
          Aucun thread assigné pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-y-2 mb-4">
          {assignedThreads.map((a) => (
            <li
              key={`${a.workspaceSlug}::${a.threadSlug}`}
              className="flex items-center justify-between bg-theme-bg-primary rounded-md px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm text-white">{a.threadName}</span>
                <span className="text-xs text-white/50">
                  {a.workspaceName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.workspaceSlug, a.threadSlug)}
                className="border-none p-1 hover:bg-red-500/20 rounded"
                aria-label="Retirer ce thread"
              >
                <Trash size={16} className="text-white/70" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="block text-xs text-white/70 mb-1">Workspace</label>
          <select
            value={pickerWorkspace}
            onChange={(e) => setPickerWorkspace(e.target.value)}
            className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2"
          >
            <option value="">— Choisir —</option>
            {workspaces.map((w) => (
              <option key={w.slug} value={w.slug}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-white/70 mb-1">Thread</label>
          <select
            value={pickerThread}
            onChange={(e) => setPickerThread(e.target.value)}
            disabled={!pickerWorkspace || availableInWorkspace.length === 0}
            className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg block w-full p-2 disabled:opacity-50"
          >
            {availableInWorkspace.length === 0 ? (
              <option value="">— Aucun disponible —</option>
            ) : (
              availableInWorkspace.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!pickerWorkspace || !pickerThread || adding}
          className="bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-30"
        >
          {adding ? "..." : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

function AutoSpeakPreference() {
  const [autoPlayAssistantTtsResponse, setAutoPlayAssistantTtsResponse] =
    useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const settings = Appearance.getSettings();
    setAutoPlayAssistantTtsResponse(
      settings.autoPlayAssistantTtsResponse ?? false
    );
  }, []);

  const handleChange = (checked) => {
    setAutoPlayAssistantTtsResponse(checked);
    Appearance.updateSettings({ autoPlayAssistantTtsResponse: checked });
  };

  return (
    <div>
      <div className="flex items-center gap-x-1 mb-2">
        <label
          htmlFor="autoSpeak"
          className="block text-sm font-medium text-white"
        >
          {t("customization.chat.auto_speak.title")}
        </label>
        <div
          data-tooltip-id="auto-speak-info"
          data-tooltip-content={t("customization.chat.auto_speak.description")}
          className="cursor-pointer h-fit"
        >
          <Info size={16} weight="bold" className="text-white" />
        </div>
      </div>
      <Toggle
        size="lg"
        enabled={autoPlayAssistantTtsResponse}
        onChange={handleChange}
      />
      <Tooltip
        id="auto-speak-info"
        place="bottom"
        delayShow={300}
        className="allm-tooltip !allm-text-xs"
      />
    </div>
  );
}
