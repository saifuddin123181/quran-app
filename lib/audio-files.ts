// Rules for recitation uploads, shared by the admin uploader (browser) and the server.
// MP3 and M4A/AAC play in every mobile browser, including iPhone Safari.
export const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".m4a",
};
export const AUDIO_ACCEPT = ".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac";
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// Storage path for a page's recording: "audio/003.mp3" (Vercel Blob adds a random suffix).
export function audioPathname(page: number, contentType: string) {
  return `audio/${String(page).padStart(3, "0")}${AUDIO_TYPES[contentType] ?? ".mp3"}`;
}

// The page a stored file belongs to, from names like "003.mp3" or "003-Xy12ab.mp3".
export function pageFromFileName(name: string) {
  const match = /^(\d{3})(?:[-.]|$)/.exec(name);
  return match ? Number(match[1]) : null;
}
