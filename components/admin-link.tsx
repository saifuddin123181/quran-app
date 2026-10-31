"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { currentReader, isAdminReader, subscribeNever } from "@/lib/reader-cookie";

// Shortcut back to /admin on the reader home screen when signed in as admin.
// /admin itself checks the signed admin session.
export function AdminLink() {
  const admin = useSyncExternalStore(subscribeNever, () => isAdminReader(currentReader()), () => false);
  if (!admin) return null;

  return (
    <Link
      href="/admin"
      className="h-10 rounded-lg px-3 text-sm leading-10 text-black/70 active:bg-black/10 dark:text-white/70 dark:active:bg-white/15"
    >
      Admin
    </Link>
  );
}
