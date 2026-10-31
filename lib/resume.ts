// Where the reader left off: the last page shown and how far into its recitation they got.
// Kept in this browser's localStorage, separately for each signed-in reader (named by the
// "reader" cookie set at sign-in), so it survives closing the tab, refreshing and signing out,
// and readers sharing a device never see each other's bookmark. Storage can be unavailable
// (private mode, blocked site data), so every access is guarded and the app works without it.
import { currentReader } from "./reader-cookie";

export type ResumePoint = { page: number; time: number };

const KEY_PREFIX = "quran-app:resume:v2:";
// Before bookmarks were kept per reader, one was shared by everyone on the device.
const SHARED_KEY = "quran-app:resume:v1";
const listeners = new Set<() => void>();

function storageKey() {
  const reader = currentReader();
  return reader ? KEY_PREFIX + reader : null;
}

export function readResumeRaw(): string | null {
  const key = storageKey();
  if (!key) return null;
  try {
    localStorage.removeItem(SHARED_KEY);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parseResume(raw: string | null): ResumePoint | null {
  if (!raw) return null;
  try {
    const { page, time } = JSON.parse(raw);
    return Number.isInteger(page) && page > 0 ? { page, time: Number(time) > 0 ? Number(time) : 0 } : null;
  } catch {
    return null;
  }
}

export function readResume() {
  return parseResume(readResumeRaw());
}

export function saveResume(point: ResumePoint) {
  const key = storageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify({ page: point.page, time: Math.round(point.time * 10) / 10 }));
  } catch {
    return;
  }
  listeners.forEach((notify) => notify());
}

// For useSyncExternalStore: changes from this tab and from other tabs.
export function subscribeResume(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => e.key?.startsWith(KEY_PREFIX) && onChange();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
