"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { audioUploaded, deletePageAudio } from "@/app/admin/actions";
import { AUDIO_ACCEPT, AUDIO_TYPES, MAX_AUDIO_BYTES, audioPathname } from "@/lib/audio-files";
import { juzOnPage, surahOnPage } from "@/lib/mushaf-pages";
import { TOTAL_PAGES } from "@/lib/quran-data";

type Storage = "blob" | "local";
type Item = { file: File; page: number | null; status: "waiting" | "uploading" | "done" | "error"; progress: number; error?: string };

// Some phones report an empty type for audio files; fall back to the file extension.
function withAudioType(file: File) {
  if (file.type in AUDIO_TYPES) return file;
  const type = /\.mp3$/i.test(file.name) ? "audio/mpeg" : /\.(m4a|aac)$/i.test(file.name) ? "audio/mp4" : file.type;
  return new File([file], file.name, { type });
}

// "007.mp3", "page 7.m4a", "7 - Al-Baqarah.mp3" -> 7
function pageFromName(name: string) {
  const match = /(\d{1,3})/.exec(name);
  const page = match ? Number(match[1]) : NaN;
  return page >= 1 && page <= TOTAL_PAGES ? page : null;
}

function validPage(page: number) {
  return Number.isInteger(page) && page >= 1 && page <= TOTAL_PAGES;
}

function describePage(page: number) {
  const surah = surahOnPage(page);
  return `${surah.name} ${surah.arabic} · Juz ${juzOnPage(page)}`;
}

// Local development: post to our own route (with progress). XHR because fetch can't report upload progress.
function uploadLocal(page: number, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/audio");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => {
      if (xhr.status < 300) return resolve();
      try {
        reject(new Error(JSON.parse(xhr.responseText).error));
      } catch {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."));
    const form = new FormData();
    form.set("page", String(page));
    form.set("file", file);
    xhr.send(form);
  });
}

async function uploadOne(storage: Storage, page: number, raw: File, onProgress: (pct: number) => void) {
  const file = withAudioType(raw);
  if (!(file.type in AUDIO_TYPES)) throw new Error("Only MP3 or M4A files.");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("File is larger than 25 MB.");

  if (storage === "blob") {
    // Straight from the phone to Vercel Blob storage (see app/api/admin/audio/blob/route.ts).
    const blob = await upload(audioPathname(page, file.type), file, {
      access: "public",
      handleUploadUrl: "/api/admin/audio/blob",
      clientPayload: String(page),
      contentType: file.type,
      onUploadProgress: ({ percentage }) => onProgress(percentage),
    });
    await audioUploaded(page, blob.url);
  } else {
    await uploadLocal(page, file, onProgress);
    await audioUploaded(page);
  }
}

export function AdminAudio({ audio, storage }: { audio: Record<number, string>; storage: Storage }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pageText, setPageText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const page = Number(pageText);
  const single = items.length === 1;
  const recorded = Object.keys(audio).map(Number).sort((a, b) => a - b);
  const ready = items.length > 0 && !busy && (single ? validPage(page) : items.every((i) => i.page));

  function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    setMessage(null);
    setItems(
      [...files].map((file) => ({
        file,
        page: files.length === 1 ? null : pageFromName(file.name),
        status: "waiting",
        progress: 0,
      })),
    );
  }

  function update(index: number, patch: Partial<Item>) {
    setItems((all) => all.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function startUpload() {
    setBusy(true);
    setMessage(null);
    let failed = 0;
    for (const [index, item] of items.entries()) {
      const target = single ? page : item.page!;
      update(index, { status: "uploading", progress: 0 });
      try {
        await uploadOne(storage, target, item.file, (progress) => update(index, { progress }));
        update(index, { status: "done", progress: 100 });
      } catch (error) {
        failed++;
        update(index, { status: "error", error: (error as Error).message });
      }
    }
    setBusy(false);
    router.refresh();
    if (!failed) {
      setMessage(single ? `Page ${page} recording uploaded.` : `${items.length} recordings uploaded.`);
      setItems([]);
      setPageText("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(target: number) {
    if (!confirm(`Delete the recording for page ${target}?`)) return;
    await deletePageAudio(target);
    router.refresh();
  }

  function replace(target: number) {
    setPageText(String(target));
    setItems([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    fileInput.current?.click();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-lg font-semibold">Upload a recitation</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          MP3 or M4A, up to 25 MB. To upload many at once, name the files by page number (e.g. 007.mp3) and
          choose them together.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => chooseFiles(e.target.files)}
          id="audio-files"
        />
        <label
          htmlFor="audio-files"
          className="mt-4 flex h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-black/20 text-base font-medium active:bg-black/5 dark:border-white/25"
        >
          {items.length ? "Choose different files" : "Choose audio file"}
        </label>

        {single && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="page" className="text-sm font-medium">
              Page number (1–{TOTAL_PAGES})
            </label>
            <input
              id="page"
              type="number"
              inputMode="numeric"
              min={1}
              max={TOTAL_PAGES}
              value={pageText}
              onChange={(e) => setPageText(e.target.value)}
              placeholder="e.g. 7"
              className="h-12 rounded-xl border border-black/15 bg-transparent px-4 text-base outline-none focus:border-[#1d5fa8] focus:ring-2 focus:ring-[#1d5fa8]/20 dark:border-white/20"
            />
            {validPage(page) && (
              <p className="text-sm text-black/60 dark:text-white/60">
                {describePage(page)}
                {audio[page] && <span className="text-amber-700 dark:text-amber-400"> · replaces the current recording</span>}
              </p>
            )}
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {items.map((item, i) => (
              <li key={i} className="rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{item.file.name}</span>
                  <span className="shrink-0 tabular-nums text-black/60 dark:text-white/60">
                    {(item.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                {!single && (
                  <p className={item.page ? "text-black/60 dark:text-white/60" : "text-red-600"}>
                    {item.page ? `→ Page ${item.page}${audio[item.page] ? " (replaces)" : ""}` : "No page number in the file name"}
                  </p>
                )}
                {item.status !== "waiting" && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                    <div
                      className={`h-full transition-[width] ${item.status === "error" ? "bg-red-600" : "bg-[#1d5fa8]"}`}
                      style={{ width: `${item.status === "error" ? 100 : item.progress}%` }}
                    />
                  </div>
                )}
                {item.error && <p className="mt-1 text-red-600">{item.error}</p>}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={!ready}
          onClick={startUpload}
          className="mt-4 h-12 w-full rounded-xl bg-[#1d5fa8] text-base font-medium text-white active:opacity-80 disabled:opacity-40"
        >
          {busy ? "Uploading…" : items.length > 1 ? `Upload ${items.length} recordings` : "Upload"}
        </button>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          Recorded pages <span className="font-normal text-black/50 dark:text-white/50">({recorded.length})</span>
        </h2>
        {recorded.length === 0 ? (
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">No recordings yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5 dark:divide-white/10">
            {recorded.map((p) => (
              <li key={p} className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1d5fa8]/10 text-sm font-semibold text-[#1d5fa8] tabular-nums dark:bg-[#1d5fa8]/25 dark:text-[#8cc0f0]">
                    {p}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">{describePage(p)}</p>
                </div>
                <audio controls preload="none" src={audio[p]} className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => replace(p)}
                    className="h-11 rounded-xl border border-black/15 text-sm font-medium active:bg-black/5 dark:border-white/20"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="h-11 rounded-xl border border-red-600/30 text-sm font-medium text-red-700 active:bg-red-600/10 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
