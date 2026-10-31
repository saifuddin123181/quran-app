"use client";

import { useState } from "react";

const TABS = ["Surah", "Juz"] as const;

export function HomeTabs({ surah, juz }: { surah: React.ReactNode; juz: React.ReactNode }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Surah");

  return (
    <>
      <div
        role="tablist"
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 grid grid-cols-2 gap-1 bg-background px-4 pb-3"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 rounded-xl text-base font-medium transition-colors ${
              tab === t
                ? "bg-emerald-700 text-white"
                : "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "Surah" ? surah : juz}</div>
    </>
  );
}
