import { useEffect, useState, useSyncExternalStore } from "react";
import UserSchedule from "@/models/userSchedule";

let _slots = [];
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
  return _slots;
}

async function loadOnce() {
  if (_loaded) return _slots;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = UserSchedule.list()
    .then((list) => {
      _slots = Array.isArray(list) ? list : [];
      _loaded = true;
      emit();
      return _slots;
    })
    .finally(() => {
      _loadingPromise = null;
    });
  return _loadingPromise;
}

async function refresh() {
  const list = await UserSchedule.list();
  _slots = Array.isArray(list) ? list : [];
  _loaded = true;
  emit();
  return _slots;
}

async function addSlot(payload) {
  const res = await UserSchedule.add(payload);
  if (res?.success && res.slot) {
    _slots = [..._slots, res.slot];
    emit();
  }
  return res;
}

async function updateSlot(id, payload) {
  const res = await UserSchedule.update(id, payload);
  if (res?.success && res.slot) {
    _slots = _slots.map((s) => (s.id === id ? res.slot : s));
    emit();
  }
  return res;
}

async function removeSlot(id) {
  const prev = _slots;
  _slots = _slots.filter((s) => s.id !== id);
  emit();
  const res = await UserSchedule.remove(id);
  if (!res?.success) {
    _slots = prev;
    emit();
  }
  return res;
}

export default function useUserSchedule() {
  const slots = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [loading, setLoading] = useState(!_loaded);
  useEffect(() => {
    if (_loaded) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadOnce().finally(() => setLoading(false));
  }, []);
  return { slots, loading, addSlot, updateSlot, removeSlot, refresh };
}
