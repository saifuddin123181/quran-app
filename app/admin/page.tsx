import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminAudio } from "@/components/admin-audio";
import { isAdmin } from "@/lib/admin-auth";
import { audioStorage, getAudioPages } from "@/lib/audio-store";
import { adminLogout } from "./actions";

export const metadata: Metadata = {
  title: "Admin · Quran App",
};

export default function AdminPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex h-14 items-center justify-between">
        <h1 className="text-xl font-semibold">Recitations</h1>
        <div className="flex items-center gap-1">
          <Link href="/" className="h-10 rounded-lg px-3 text-sm leading-10 text-black/70 active:bg-black/10 dark:text-white/70">
            Reader
          </Link>
          <form action={adminLogout}>
            <button type="submit" className="h-10 rounded-lg px-3 text-sm text-black/70 active:bg-black/10 dark:text-white/70">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <Suspense fallback={<p className="py-8 text-center text-black/60 dark:text-white/60">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  // The session check reads the current time (token expiry), so render this at request time.
  await connection();
  // proxy.ts already keeps signed-out visitors out; this is the server-side backstop.
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminAudio audio={await getAudioPages()} storage={audioStorage()} />;
}
