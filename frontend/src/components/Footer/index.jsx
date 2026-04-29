import { Envelope, GithubLogo, DiscordLogo, BookOpen, Scales } from "@phosphor-icons/react";
import React, { useState } from "react";

export const ICON_COMPONENTS = {
  Envelope,
  GithubLogo,
  DiscordLogo,
  BookOpen,
  Scales,
};
import SettingsButton from "../SettingsButton";
import ContactModal from "../ContactModal";
import LegalModal from "../LegalModal";
import { isMobile } from "react-device-detect";
import { Tooltip } from "react-tooltip";

export default function Footer() {
  const [showContact, setShowContact] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  return (
    <>
      <div className="flex justify-center mb-2">
        <div className="flex space-x-4">
          <div className="flex w-fit">
            <button
              onClick={() => setShowContact(true)}
              className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
              aria-label="Nous contacter"
              data-tooltip-id="footer-item"
              data-tooltip-content="Nous contacter"
            >
              <Envelope weight="fill" className="h-5 w-5 text-white light:text-slate-800" />
            </button>
          </div>
          <div className="flex w-fit">
            <button
              onClick={() => setShowLegal(true)}
              className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
              aria-label="Informations légales"
              data-tooltip-id="footer-item"
              data-tooltip-content="Informations légales"
            >
              <Scales weight="fill" className="h-5 w-5 text-white light:text-slate-800" />
            </button>
          </div>
          {!isMobile && <SettingsButton />}
        </div>
        <Tooltip id="footer-item" place="top" delayShow={300} className="tooltip !text-xs z-99" />
      </div>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
    </>
  );
}
