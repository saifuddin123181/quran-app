import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Quran App",
};

export default function LoginPage() {
  return (
    // Top-aligned on phones so the on-screen keyboard never covers the form;
    // centered as a card from the sm breakpoint up.
    <main className="flex min-h-dvh flex-col px-5 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-center sm:pt-8">
      <div className="w-full sm:max-w-sm sm:rounded-2xl sm:border sm:border-black/10 sm:p-8 sm:shadow-sm sm:dark:border-white/15">
        <h1 className="mb-1 text-3xl font-semibold sm:text-2xl">Sign in</h1>
        <p className="mb-8 text-base text-black/60 sm:mb-6 sm:text-sm dark:text-white/60">
          Welcome back to Quran App.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
