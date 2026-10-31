// Where the reader left off: the last page shown and how far into its recitation they got.
// Kept in this browser's localStorage, so it survives closing the tab, refreshing and signing
// out on the same device. Storage can be unavailable (private mode, blocked site data), so every
// access is guarded and the app works without it.
export type ResumePoint = { page: number; time: number };

const KEY = "quran-app:resume:v1";
const listeners = new Set<() => void>();

export function readResumeRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
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
  try {
    localStorage.setItem(KEY, JSON.stringify({ page: point.page, time: Math.round(point.time * 10) / 10 }));
  } catch {
    return;
  }
  listeners.forEach((notify) => notify());
}

// For useSyncExternalStore: changes from this tab and from other tabs.
export function subscribeResume(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
