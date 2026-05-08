import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import {
  CalendarBlank,
  Person,
  SignOut,
  Star,
  UserCircle,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AccountModal from "../AccountModal";
import PlanningSheet, { PLANNING_SHEET_OPEN_EVENT } from "../../PlanningSheet";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import { useTranslation } from "react-i18next";

export default function UserButton() {
  const { t } = useTranslation();
  const mode = useLoginMode();
  const { user } = useUser();
  const location = useLocation();
  const menuRef = useRef();
  const buttonRef = useRef();
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSection, setAccountSection] = useState(null);

  // Sur /student/*, StudentLayout a un header h-16 (64px). On centre le
  // bouton dedans plutôt que de le laisser flotter avec les offsets admin
  // (md:top-9 = 36px) qui débordent sous le header.
  const isStudentRoute = location.pathname.startsWith("/student");

  const handleClose = (event) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target) &&
      !buttonRef.current.contains(event.target)
    ) {
      setShowMenu(false);
    }
  };

  const openSpace = (section) => {
    setAccountSection(section);
    setShowAccountSettings(true);
    setShowMenu(false);
  };

  useEffect(() => {
    if (showMenu) {
      document.addEventListener("mousedown", handleClose);
    }
    return () => document.removeEventListener("mousedown", handleClose);
  }, [showMenu]);

  // Permet aux autres parties de l'UI (ex. bouton "Mon planning" du chatinput)
  // d'ouvrir AccountModal directement sur une section donnée.
  useEffect(() => {
    function onOpen(e) {
      const section = e?.detail?.section || null;
      setAccountSection(section);
      setShowAccountSettings(true);
      setShowMenu(false);
    }
    window.addEventListener("sara:openAccountSection", onOpen);
    return () => window.removeEventListener("sara:openAccountSection", onOpen);
  }, []);

  if (mode === null) return null;
  return (
    <div
      className={
        isStudentRoute
          ? "fixed top-[14px] right-4 md:right-8 w-fit h-fit z-[130]"
          : "fixed top-3 right-4 md:absolute md:top-9 md:right-10 w-fit h-fit z-[130]"
      }
    >
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        type="button"
        className="uppercase transition-all duration-300 w-[35px] h-[35px] text-base font-semibold rounded-full flex items-center bg-theme-action-menu-bg hover:bg-theme-action-menu-item-hover justify-center text-white p-2 hover:border-slate-100 hover:border-opacity-50 border-transparent border"
      >
        {mode === "multi" ? <UserDisplay /> : <Person size={14} />}
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className="min-w-[220px] rounded-lg absolute top-12 right-0 bg-theme-action-menu-bg p-2 shadow-xl shadow-black/40"
        >
          <div className="flex flex-col gap-y-1">
            {mode === "multi" && !!user && (
              <>
                <MenuItem
                  icon={<CalendarBlank size={18} weight="duotone" />}
                  label="Mon planning"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent(PLANNING_SHEET_OPEN_EVENT)
                    );
                    setShowMenu(false);
                  }}
                />
                <MenuItem
                  icon={<Star size={18} weight="duotone" />}
                  label="Mes favoris"
                  onClick={() => openSpace("favorites")}
                />
                <MenuItem
                  icon={<UserCircle size={18} weight="duotone" />}
                  label="Mon profil"
                  onClick={() => openSpace("profile")}
                />
                <div className="my-1 h-px bg-white/10" />
              </>
            )}
            <MenuItem
              icon={<SignOut size={18} weight="duotone" />}
              label={t("profile_settings.signout")}
              onClick={() => {
                window.localStorage.removeItem(AUTH_USER);
                window.localStorage.removeItem(AUTH_TOKEN);
                window.localStorage.removeItem(AUTH_TIMESTAMP);
                window.localStorage.removeItem(LAST_VISITED_WORKSPACE);
                window.localStorage.removeItem(USER_PROMPT_INPUT_MAP);
                window.location.replace(paths.home());
              }}
            />
          </div>
        </div>
      )}
      {user && showAccountSettings && (
        <AccountModal
          user={user}
          initialSection={accountSection}
          hideModal={() => {
            setShowAccountSettings(false);
            setAccountSection(null);
          }}
        />
      )}
      <PlanningSheet />
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-none flex items-center gap-x-2 text-white hover:bg-theme-action-menu-item-hover w-full text-left px-3 py-2 rounded-md text-sm"
    >
      <span className="text-white/80 shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function UserDisplay() {
  const { pfp } = usePfp();
  const user = userFromStorage();

  if (pfp) {
    return (
      <div className="w-[35px] h-[35px] rounded-full flex-shrink-0 overflow-hidden transition-all duration-300 bg-gray-100 hover:border-slate-100 hover:border-opacity-50 border-transparent border hover:opacity-60">
        <img
          src={pfp}
          alt="User profile picture"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return user?.username?.slice(0, 2) || "AA";
}
