import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MushafImage } from "@/components/mushaf-image";
import { PageAudioPlayer, PageAudioSync } from "@/components/page-audio";
import { PageSwipe } from "@/components/page-swipe";
import { pageImageUrl } from "@/lib/mushaf-pages";
import { TOTAL_PAGES } from "@/lib/quran-data";

function parsePage(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_PAGES ? n : null;
}

export async function generateMetadata({ params }: PageProps<"/page/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: `Page ${number} · Quran App` };
}

// Match the browser bar to the white page scans in both light and dark mode.
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function ReaderPage({ params }: PageProps<"/page/[number]">) {
  return (
    <div className="mushaf-reader flex min-h-dvh flex-col">
      <Suspense fallback={<ReaderSkeleton />}>
        {params.then(({ number }) => {
          const pageNumber = parsePage(number);
          if (!pageNumber) notFound();
          return <Reader pageNumber={pageNumber} />;
        })}
      </Suspense>
    </div>
  );
}

function Reader({ pageNumber }: { pageNumber: number }) {
  const nextHref = pageNumber < TOTAL_PAGES ? `/page/${pageNumber + 1}` : null;
  const prevHref = pageNumber > 1 ? `/page/${pageNumber - 1}` : null;

  return (
    <>
      {/* Keyed by page so each page starts with a fresh swipe state and its own enter animation. */}
      <PageSwipe key={pageNumber} pageNumber={pageNumber} nextHref={nextHref} prevHref={prevHref}>
        <main className="flex flex-1 flex-col justify-center px-1 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-6">
          <MushafImage
            src={pageImageUrl(pageNumber)}
            nextSrc={nextHref ? pageImageUrl(pageNumber + 1) : null}
            pageNumber={pageNumber}
          />
        </main>
      </PageSwipe>

      <PageAudioSync page={pageNumber} />
      <div className="sticky bottom-0">
        {/* Floats just above the bottom bar, over the page, without taking any of its space. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-full px-3 pb-3 sm:px-6">
          <PageAudioPlayer />
        </div>
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-black/10 bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
          {/* Mushaf pages advance to the left, so "Next" sits on the left. */}
          <PageLink href={nextHref} label="‹ Next" />
          <Link
            href="/"
            aria-label="Surah list"
            className="flex h-11 w-14 items-center justify-center rounded-xl text-[var(--reader-accent)] active:bg-black/10"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Link>
          <PageLink href={prevHref} label="Previous ›" />
        </nav>
      </div>
    </>
  );
}

function PageLink({ href, label }: { href: string | null; label: string }) {
  const className =
    "flex h-11 items-center justify-center rounded-xl border border-black/15 text-base font-medium text-[var(--reader-accent)]";
  if (!href) {
    return <span className={`${className} opacity-40`}>{label}</span>;
  }
  return (
    <Link href={href} prefetch={true} className={`${className} active:bg-black/10`}>
      {label}
    </Link>
  );
}

function ReaderSkeleton() {
  return (
    <main className="flex flex-1 flex-col justify-center px-1 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-6">
      {/* Same 2:3 shape as a page scan, so the page doesn't jump when it loads. */}
      <div className="mx-auto aspect-[2/3] w-full max-w-[560px] animate-pulse bg-black/5" />
    </main>
  );
}
