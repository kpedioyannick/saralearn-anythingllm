import { useEffect, useState, useSyncExternalStore } from "react";
import WorkspaceThread from "@/models/workspaceThread";

// Module-level store shared across all hook instances so a star toggle
// in any place (sidebar, account modal) reflects everywhere instantly.
let _assigned = []; // [{workspaceSlug, threadSlug, workspaceName, threadName}]
let _loaded = false;
let _loadingPromise = null;
const _listeners = new Set();

function emit() {
  for (const fn of _listeners) fn();
}

function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function getSnapshot() {
  return _assigned;
}

async function loadOnce() {
  if (_loaded) return _assigned;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = WorkspaceThread.listAssigned()
    .then((list) => {
      _assigned = Array.isArray(list) ? list : [];
      _loaded = true;
      emit();
      return _assigned;
    })
    .finally(() => {
      _loadingPromise = null;
    });
  return _loadingPromise;
}

async function refresh() {
  const list = await WorkspaceThread.listAssigned();
  _assigned = Array.isArray(list) ? list : [];
  _loaded = true;
  emit();
  return _assigned;
}

async function assign(workspaceSlug, threadSlug, threadName, workspaceName) {
  // Optimistic
  const prev = _assigned;
  if (
    !_assigned.some(
      (e) => e.workspaceSlug === workspaceSlug && e.threadSlug === threadSlug
    )
  ) {
    _assigned = [
      ..._assigned,
      {
        workspaceSlug,
        threadSlug,
        threadName: threadName || threadSlug,
        workspaceName: workspaceName || workspaceSlug,
      },
    ];
    emit();
  }
  const ok = await WorkspaceThread.assign(workspaceSlug, threadSlug);
  if (!ok) {
    _assigned = prev;
    emit();
  } else {
    // refresh in background to grab canonical names
    refresh();
  }
  return ok;
}

async function unassign(workspaceSlug, threadSlug) {
  const prev = _assigned;
  _assigned = _assigned.filter(
    (e) => !(e.workspaceSlug === workspaceSlug && e.threadSlug === threadSlug)
  );
  emit();
  const ok = await WorkspaceThread.unassign(workspaceSlug, threadSlug);
  if (!ok) {
    _assigned = prev;
    emit();
  }
  return ok;
}

function isAssigned(workspaceSlug, threadSlug) {
  return _assigned.some(
    (e) => e.workspaceSlug === workspaceSlug && e.threadSlug === threadSlug
  );
}

export default function useAssignedThreads() {
  const assignedThreads = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [loading, setLoading] = useState(!_loaded);

  useEffect(() => {
    if (_loaded) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadOnce().finally(() => setLoading(false));
  }, []);

  return {
    assignedThreads,
    loading,
    isAssigned,
    assign,
    unassign,
    refresh,
  };
}
