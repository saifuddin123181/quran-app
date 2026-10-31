"use client";

import { useRouter } from "next/navigation";

export function GoToPage({ totalPages }: { totalPages: number }) {
  const router = useRouter();

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const page = Number(new FormData(e.currentTarget).get("page"));
        if (page >= 1 && page <= totalPages) router.push(`/page/${page}`);
      }}
    >
      <label htmlFor="page" className="sr-only">
        Page number
      </label>
      <input
        id="page"
        name="page"
        type="number"
        inputMode="numeric"
        min={1}
        max={totalPages}
        required
        placeholder={`Go to page (1–${totalPages})`}
        enterKeyHint="go"
        className="h-12 min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/20"
      />
      <button
        type="submit"
        className="h-12 shrink-0 rounded-xl bg-emerald-700 px-5 text-base font-medium text-white active:bg-emerald-900"
      >
        Go
      </button>
    </form>
  );
}
