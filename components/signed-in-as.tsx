"use client";

import { useSyncExternalStore } from "react";
import { currentReader, isAdminReader, subscribeNever } from "@/lib/reader-cookie";

// "Signed in as Saif" under a page title. Shows nothing until the browser has read the name.
export function SignedInAs() {
  const reader = useSyncExternalStore(subscribeNever, currentReader, () => null);
  if (!reader) return null;

  return (
    <p className="truncate text-xs text-black/55 dark:text-white/55">
      Signed in as <span className="font-medium text-black/80 dark:text-white/80">{isAdminReader(reader) ? "admin" : reader}</span>
    </p>
  );
}
