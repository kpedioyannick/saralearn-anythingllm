import React, { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import paths from "@/utils/paths";
import { Tooltip } from "react-tooltip";
const SIDEBAR_TOGGLE_STORAGE_KEY = "anythingllm_sidebar_toggle";
export const SIDEBAR_TOGGLE_EVENT = "sidebar-toggle";

/**
 * Returns the previous state of the sidebar from localStorage.
 * If the sidebar was closed, returns false.
 * If the sidebar was open, returns true.
 * If the sidebar state is not set, returns true.
 * @returns {boolean}
 */
function previousSidebarState() {
  const previousState = window.localStorage.getItem(SIDEBAR_TOGGLE_STORAGE_KEY);
  if (previousState === "closed") return false;
  return true;
}

export function useSidebarToggle() {
  const [showSidebar, setShowSidebar] = useState(previousSidebarState());
  const [canToggleSidebar, setCanToggleSidebar] = useState(true);

  useEffect(() => {
    function checkPath() {
      const currentPath = window.location.pathname;
      const isVisible =
        currentPath === paths.home() ||
        /^\/workspace\/[^\/]+$/.test(currentPath) ||
        /^\/workspace\/[^\/]+\/t\/[^\/]+$/.test(currentPath);
      setCanToggleSidebar(isVisible);
    }
    checkPath();
  }, [window.location.pathname]);

  useEffect(() => {
    function toggleSidebar(e) {
      if (!canToggleSidebar) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        setShowSidebar((prev) => {
          const newState = !prev;
          window.localStorage.setItem(
            SIDEBAR_TOGGLE_STORAGE_KEY,
            newState ? "open" : "closed"
          );
          return newState;
        });
      }
    }
    window.addEventListener("keydown", toggleSidebar);
    return () => {
      window.removeEventListener("keydown", toggleSidebar);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_TOGGLE_STORAGE_KEY,
      showSidebar ? "open" : "closed"
    );
    window.dispatchEvent(
      new CustomEvent(SIDEBAR_TOGGLE_EVENT, {
        detail: { open: showSidebar },
      })
    );
  }, [showSidebar]);

  return { showSidebar, setShowSidebar, canToggleSidebar };
}

export function ToggleSidebarButton({ showSidebar, setShowSidebar }) {
  const isMac = navigator.userAgent.includes("Mac");
  const shortcut = isMac ? "⌘ + Shift + S" : "Ctrl + Shift + S";

  return (
    <>
      <button
        type="button"
        className={`flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700 light:border-slate-300 bg-zinc-800/40 light:bg-white hover:bg-zinc-700 light:hover:bg-slate-100 outline-none ring-0 absolute transition-all duration-500 z-30 ${showSidebar ? "top-[14px] left-[244px]" : "top-[14px] left-[16px]"}`}
        onClick={() => setShowSidebar((prev) => !prev)}
        data-tooltip-id="sidebar-toggle"
        data-tooltip-content={
          showSidebar
            ? `Hide Sidebar (${shortcut})`
            : `Show Sidebar (${shortcut})`
        }
        aria-label={
          showSidebar
            ? `Hide Sidebar (${shortcut})`
            : `Show Sidebar (${shortcut})`
        }
      >
        {showSidebar ? (
          <X
            className="text-theme-text-secondary hover:text-theme-text-primary"
            size={24}
            weight="bold"
          />
        ) : (
          <List
            className="text-theme-text-secondary hover:text-theme-text-primary"
            size={24}
            weight="bold"
          />
        )}
      </button>
      <Tooltip
        id="sidebar-toggle"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </>
  );
}
