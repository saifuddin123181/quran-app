"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions";

const initialState: LoginState = {};

type LoginAction = (state: LoginState, formData: FormData) => Promise<LoginState>;

// text-base (16px) keeps iOS Safari from zooming in when an input is focused.
const inputClass =
  "h-12 w-full rounded-xl border border-black/15 bg-transparent px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/20";

// Used by the reader login and, with `action={adminLogin}`, the admin login.
export function LoginForm({ action = login }: { action?: LoginAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            className={`${inputClass} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex min-w-14 items-center justify-center px-3 text-sm font-medium text-emerald-700 dark:text-emerald-500"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <p aria-live="polite" className="-my-1 min-h-5 text-sm text-red-600">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-emerald-700 px-4 text-base font-medium text-white transition-colors hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
