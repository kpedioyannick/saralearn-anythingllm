import React from "react";
import { Navigate } from "react-router-dom";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import { isMobile } from "react-device-detect";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();
  const { user } = useUser();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  // Non-admin users are sent to the dedicated student UI.
  if (user && user.role !== "admin" && user.role !== "manager") {
    return <Navigate to={paths.student.home()} replace />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex">
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      <Home />
    </div>
  );
}
