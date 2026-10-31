import "server-only";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { del, list, type ListBlobResultBlob } from "@vercel/blob";
import { AUDIO_TYPES, pageFromFileName } from "./audio-files";

// Where recitation recordings live:
// - "blob": Vercel Blob, used whenever BLOB_READ_WRITE_TOKEN is set (on Vercel, connect a Blob
//   store to the project and it's set for you). Needed in production: a deployed app can't
//   write new files into public/.
// - "local": public/audio/ on this machine, for development without a Blob store.
export type AudioStorage = "blob" | "local";
export const audioStorage = (): AudioStorage => (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");

export const AUDIO_TAG = "audio-pages";
const LOCAL_DIR = path.join(process.cwd(), "public", "audio");
const BLOB_PREFIX = "audio/";

/** Page number -> URL of that page's recording. */
export type AudioPages = Record<number, string>;

export async function getAudioPages(): Promise<AudioPages> {
  "use cache";
  cacheTag(AUDIO_TAG);
  // Admin changes refresh this immediately via updateTag; this is only a safety net.
  cacheLife("minutes");

  return audioStorage() === "blob" ? listBlobAudio() : listLocalAudio();
}

// If a page somehow has several files, the newest one wins.
function newestPerPage<T>(items: T[], pageOf: (item: T) => number | null, timeOf: (item: T) => number) {
  const newest = new Map<number, T>();
  for (const item of items) {
    const page = pageOf(item);
    if (page === null) continue;
    const current = newest.get(page);
    if (!current || timeOf(item) > timeOf(current)) newest.set(page, item);
  }
  return newest;
}

async function listBlobs(): Promise<ListBlobResultBlob[]> {
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix: BLOB_PREFIX, cursor });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return blobs;
}

const blobPage = (blob: ListBlobResultBlob) => pageFromFileName(blob.pathname.slice(BLOB_PREFIX.length));

async function listBlobAudio(): Promise<AudioPages> {
  const newest = newestPerPage(await listBlobs(), blobPage, (b) => new Date(b.uploadedAt).getTime());
  return Object.fromEntries([...newest].map(([page, blob]) => [page, blob.url]));
}

async function listLocalFiles() {
  try {
    const names = await readdir(LOCAL_DIR);
    const audio = names.filter((name) => Object.values(AUDIO_TYPES).includes(path.extname(name)));
    return Promise.all(
      audio.map(async (name) => ({ name, mtimeMs: (await stat(path.join(LOCAL_DIR, name))).mtimeMs })),
    );
  } catch {
    return [];
  }
}

async function listLocalAudio(): Promise<AudioPages> {
  const newest = newestPerPage(await listLocalFiles(), (f) => pageFromFileName(f.name), (f) => f.mtimeMs);
  // ?v= busts browser caches when a recording is replaced under the same name.
  return Object.fromEntries(
    [...newest].map(([page, f]) => [page, `/audio/${f.name}?v=${Math.round(f.mtimeMs)}`]),
  );
}

/** Saves a recording to public/audio/ (local storage only), replacing the page's old one. */
export async function saveLocalAudio(page: number, file: File) {
  await mkdir(LOCAL_DIR, { recursive: true });
  await deleteLocalAudio(page);
  const name = `${String(page).padStart(3, "0")}${AUDIO_TYPES[file.type] ?? ".mp3"}`;
  await writeFile(path.join(LOCAL_DIR, name), Buffer.from(await file.arrayBuffer()));
}

async function deleteLocalAudio(page: number) {
  for (const f of await listLocalFiles()) {
    if (pageFromFileName(f.name) === page) await unlink(path.join(LOCAL_DIR, f.name));
  }
}

/** Removes a page's recording(s), keeping `keepUrl` if given (the one just uploaded). */
export async function deleteAudio(page: number, keepUrl?: string) {
  if (audioStorage() === "local") {
    if (!keepUrl) await deleteLocalAudio(page);
    return;
  }
  const stale = (await listBlobs()).filter((b) => blobPage(b) === page && b.url !== keepUrl);
  if (stale.length) await del(stale.map((b) => b.url));
}
