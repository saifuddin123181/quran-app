// The "reader" cookie (set at sign-in, see READER_NAME_COOKIE in lib/session.ts) names who is
// signed in, for per-reader bookmarks and showing the name. The admin's is "admin:<id>".
// Browser-only, and display-only: access is always checked against the signed session cookies.
export function currentReader() {
  const match = /(?:^|;\s*)reader=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isAdminReader(reader: string | null) {
  return !!reader && reader.startsWith("admin:");
}

// For useSyncExternalStore: the cookie only changes on sign-in/out, which reloads the page.
export const subscribeNever = () => () => {};
