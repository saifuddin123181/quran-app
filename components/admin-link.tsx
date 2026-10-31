"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

// The "reader" cookie (set at sign-in for per-reader bookmarks) is "admin:<id>" for the admin.
// This only decides whether to show a shortcut; /admin itself checks the signed admin session.
function signedInAsAdmin() {
  const match = /(?:^|;\s*)reader=([^;]*)/.exec(document.cookie);
  return !!match && decodeURIComponent(match[1]).startsWith("admin:");
}
const subscribeNever = () => () => {};

export function AdminLink() {
  const admin = useSyncExternalStore(subscribeNever, signedInAsAdmin, () => false);
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
