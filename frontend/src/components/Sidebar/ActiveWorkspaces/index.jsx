import React, { useState, useEffect } from "react";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Workspace from "@/models/workspace";
import ManageWorkspace, {
  useManageWorkspaceModal,
} from "../../Modals/ManageWorkspace";
import paths from "@/utils/paths";
import { useParams, useNavigate, useMatch } from "react-router-dom";
import { GearSix, UploadSimple, DotsSixVertical } from "@phosphor-icons/react";
import useUser from "@/hooks/useUser";
import ThreadContainer from "./ThreadContainer";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import showToast from "@/utils/toast";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";

export default function ActiveWorkspaces() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const { showing, showModal, hideModal } = useManageWorkspaceModal();
  const { user } = useUser();
  const isInWorkspaceSettings = !!useMatch("/workspace/:slug/settings/:tab");
  const isHomePage = !!useMatch("/");

  useEffect(() => {
    async function getWorkspaces() {
      const workspaces = await Workspace.all();
      setLoading(false);
      setWorkspaces(Workspace.orderWorkspaces(workspaces));
    }
    getWorkspaces();
  }, []);

  if (loading) {
    return (
      <Skeleton.default
        height={40}
        width="100%"
        count={5}
        baseColor="var(--theme-sidebar-item-default)"
        highlightColor="var(--theme-sidebar-item-hover)"
        enableAnimation={true}
        className="my-1"
      />
    );
  }

  /**
   * Reorders workspaces in the UI via localstorage on client side.
   * @param {number} startIndex - the index of the workspace to move
   * @param {number} endIndex - the index to move the workspace to
   */
  function reorderWorkspaces(startIndex, endIndex) {
    const reorderedWorkspaces = Array.from(workspaces);
    const [removed] = reorderedWorkspaces.splice(startIndex, 1);
    reorderedWorkspaces.splice(endIndex, 0, removed);
    setWorkspaces(reorderedWorkspaces);
    const success = Workspace.storeWorkspaceOrder(
      reorderedWorkspaces.map((w) => w.id)
    );
    if (!success) {
      showToast("Failed to reorder workspaces", "error");
      Workspace.all().then((workspaces) => setWorkspaces(workspaces));
    }
  }

  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderWorkspaces(result.source.index, result.destination.index);
  };

  // When on the home page, resolve which workspace should be virtually active
  const virtualActiveSlug = (() => {
    if (!isHomePage || workspaces.length === 0) return null;
    const lastVisited = safeJsonParse(
      localStorage.getItem(LAST_VISITED_WORKSPACE)
    );
    if (
      lastVisited?.slug &&
      workspaces.some((ws) => ws.slug === lastVisited.slug)
    )
      return lastVisited.slug;
    return workspaces[0]?.slug ?? null;
  })();

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="workspaces">
        {(provided) => (
          <div
            role="list"
            aria-label="Workspaces"
            className="flex flex-col gap-y-3"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {workspaces.map((workspace, index) => {
              const isVirtuallyActive = workspace.slug === virtualActiveSlug;
              const isActive = workspace.slug === slug || isVirtuallyActive;
              return (
                <Draggable
                  key={workspace.id}
                  draggableId={workspace.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex flex-col w-full group ${
                        snapshot.isDragging ? "opacity-50" : ""
                      }`}
                      role="listitem"
                    >
                      <div className="flex gap-x-2 items-center justify-between">
                        <a
                          href={
                            isActive
                              ? null
                              : paths.workspace.chat(workspace.slug)
                          }
                          aria-current={isActive ? "page" : ""}
                          className={`
                            transition-colors duration-[200ms]
                            flex flex-grow w-full gap-x-2 py-[8px] pl-[6px] pr-[8px] rounded-[8px] text-white justify-start items-start
                            border-l-2 border-y border-r border-y-transparent border-r-transparent bg-theme-sidebar-item-default
                            ${
                              isActive
                                ? "bg-zinc-800/70 light:bg-slate-100 border-l-slate-400 light:border-l-slate-700"
                                : "border-l-transparent hover:bg-zinc-800/40 light:hover:bg-slate-100/60"
                            }
                          `}
                        >
                          <div className="flex flex-row justify-between w-full items-start gap-x-2">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab mr-[3px] mt-[2px] shrink-0"
                            >
                              <DotsSixVertical
                                size={20}
                                className={`${isActive ? "text-white light:text-slate-800" : "text-zinc-400 light:text-slate-500"}`}
                                weight="bold"
                              />
                            </div>
                            <div className="flex items-start flex-grow min-w-0">
                              <p
                                className={`
                                  text-[14px] leading-[1.4] break-words whitespace-normal
                                  ${isActive ? "font-bold text-white light:text-slate-900" : "font-medium text-zinc-300 light:text-theme-text-primary"}
                                  w-full
                                `}
                              >
                                {workspace.name}
                              </p>
                            </div>
                            {user?.role !== "default" && (
                              <div className="flex items-center gap-x-[2px] shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedWs(workspace);
                                    showModal();
                                  }}
                                  className={`group/upload border-none rounded-md flex items-center justify-center ml-auto p-[2px] hover:bg-zinc-700/50 light:hover:bg-slate-200`}
                                >
                                  <UploadSimple
                                    className={`h-[20px] w-[20px] ${isActive ? "text-zinc-100 hover:text-white light:text-slate-700 light:group-hover/upload:text-slate-900" : "text-zinc-400 hover:text-white light:text-slate-500 light:group-hover/upload:text-slate-700"}`}
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(
                                      isInWorkspaceSettings
                                        ? paths.workspace.chat(workspace.slug)
                                        : paths.workspace.settings.generalAppearance(
                                            workspace.slug
                                          )
                                    );
                                  }}
                                  className={`group/gear rounded-md flex items-center justify-center ml-auto p-[2px] hover:bg-zinc-700/50 light:hover:bg-slate-200`}
                                  aria-label="General appearance settings"
                                >
                                  <GearSix
                                    color={
                                      isInWorkspaceSettings &&
                                      workspace.slug === slug
                                        ? "#22C55E"
                                        : undefined
                                    }
                                    className={`h-[20px] w-[20px] ${isActive ? "text-zinc-100 hover:text-white light:text-slate-700 light:group-hover/gear:text-slate-900" : "text-zinc-400 hover:text-white light:text-slate-500 light:group-hover/gear:text-slate-700"}`}
                                  />
                                </button>
                              </div>
                            )}
                          </div>
                        </a>
                      </div>
                      {isActive && (
                        <ThreadContainer
                          workspace={workspace}
                          isActive={isActive}
                          isVirtualThread={isVirtuallyActive}
                        />
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
            {showing && (
              <ManageWorkspace
                hideModal={hideModal}
                providedSlug={selectedWs ? selectedWs.slug : null}
              />
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
