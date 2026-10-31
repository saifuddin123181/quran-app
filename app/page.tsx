import Link from "next/link";
import { logout } from "@/app/actions";
import { AdminLink } from "@/components/admin-link";
import { ContinueReading } from "@/components/continue-reading";
import { GoToPage } from "@/components/go-to-page";
import { HomeTabs } from "@/components/home-tabs";
import { JUZ_NAMES, JUZ_START_PAGES, SURAHS, TOTAL_PAGES } from "@/lib/quran-data";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between bg-background px-4 pt-[env(safe-area-inset-top)]">
        <h1 className="text-xl font-semibold">Quran</h1>
        <div className="flex items-center gap-1">
          <AdminLink />
          <form action={logout}>
            <button
              type="submit"
              className="h-10 rounded-lg px-3 text-sm text-black/70 active:bg-black/10 dark:text-white/70 dark:active:bg-white/15"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
        <ContinueReading />
        <GoToPage totalPages={TOTAL_PAGES} />
      </div>

      <HomeTabs surah={<SurahList />} juz={<JuzList />} />

      <footer className="px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-black/50 dark:text-white/50">
        15-line Saudi color Mushaf
      </footer>
    </div>
  );
}

function SurahList() {
  return (
    <ul className="divide-y divide-black/5 px-4 dark:divide-white/10">
      {SURAHS.map((s) => (
        <li key={s.id}>
          <Link href={`/page/${s.page}`} className="flex items-center gap-3 py-3 active:opacity-60">
            <NumberBadge value={s.id} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="truncate text-sm text-black/55 dark:text-white/55">{s.verses} verses</p>
            </div>
            <div className="shrink-0 text-right">
              <p dir="rtl" className="text-xl leading-tight">
                {s.arabic}
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">Page {s.page}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function JuzList() {
  return (
    <ul className="divide-y divide-black/5 px-4 dark:divide-white/10">
      {JUZ_START_PAGES.map((start, i) => {
        const end = (JUZ_START_PAGES[i + 1] ?? TOTAL_PAGES + 1) - 1;
        return (
          <li key={start}>
            <Link href={`/page/${start}`} className="flex items-center gap-3 py-3 active:opacity-60">
              <NumberBadge value={i + 1} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Juz {i + 1}</p>
                <p className="text-sm text-black/55 tabular-nums dark:text-white/55">
                  Pages {start}–{end}
                </p>
              </div>
              <p dir="rtl" className="shrink-0 text-lg">
                {JUZ_NAMES[i]}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NumberBadge({ value }: { value: number }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1d5fa8]/10 text-sm font-semibold text-[#1d5fa8] tabular-nums dark:bg-[#1d5fa8]/25 dark:text-[#8cc0f0]">
      {value}
    </span>
  );
}
