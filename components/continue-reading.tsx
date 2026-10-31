"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { juzOnPage, surahOnPage } from "@/lib/mushaf-pages";
import { TOTAL_PAGES } from "@/lib/quran-data";
import { parseResume, readResumeRaw, subscribeResume } from "@/lib/resume";

function formatTime(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// "Continue reading" card for the page (and recitation position) the reader last left off at.
// It only exists in this browser, so nothing shows on the server or for first-time readers.
export function ContinueReading() {
  const raw = useSyncExternalStore(subscribeResume, readResumeRaw, () => null);
  const resume = parseResume(raw);
  if (!resume || resume.page > TOTAL_PAGES) return null;

  const surah = surahOnPage(resume.page);

  return (
    <Link
      href={`/page/${resume.page}`}
      className="flex items-center gap-3 rounded-2xl bg-[#1d5fa8] p-4 text-white active:opacity-85"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-white/75">Continue reading</span>
        <span className="block truncate font-semibold">
          Page {resume.page} · {surah.name}
        </span>
        <span className="block truncate text-sm text-white/75">
          Juz {juzOnPage(resume.page)}
          {resume.time > 0 && ` · recitation from ${formatTime(resume.time)}`}
        </span>
      </span>
      <span className="text-2xl text-white/80" aria-hidden>
        ›
      </span>
    </Link>
  );
}
