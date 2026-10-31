// Page scans extracted from the 15-line Saudi color Mushaf PDF: 001.jpg is the title page,
// 002.jpg is Al-Fatihah, up to 611.jpg. Served from public/mushaf/ by default; on Vercel, set
// NEXT_PUBLIC_MUSHAF_BASE_URL to where they were uploaded in Blob storage (see README), since the
// 108 MB of images exceed the Hobby plan's 100 MB deployment limit.
import { JUZ_START_PAGES, SURAHS } from "./quran-data";

const MUSHAF_BASE_URL = process.env.NEXT_PUBLIC_MUSHAF_BASE_URL ?? "/mushaf";

export function pageImageUrl(pageNumber: number) {
  return `${MUSHAF_BASE_URL}/${String(pageNumber).padStart(3, "0")}.jpg`;
}

// The surah and juz a page belongs to: the last ones starting on or before it.
export function surahOnPage(pageNumber: number) {
  return SURAHS.findLast((s) => s.page <= pageNumber) ?? SURAHS[0];
}

export function juzOnPage(pageNumber: number) {
  return Math.max(1, JUZ_START_PAGES.findLastIndex((start) => start <= pageNumber) + 1);
}
