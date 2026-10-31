"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminLogin, startAdminSession } from "@/lib/admin-auth";
import {
  READER_NAME_COOKIE,
  READER_USERS,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  safeEqual,
} from "@/lib/session";

export type LoginState = { error?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Check every account, evaluating both comparisons for each, so a wrong username takes as
  // long as a wrong password.
  const reader = READER_USERS.map((u) => {
    const userOk = safeEqual(username, u.username);
    const passOk = safeEqual(password, u.password);
    return userOk && passOk;
  }).some(Boolean);
  const admin = isAdminLogin(username, password);

  // The admin can sign in here too; they go to the admin area.
  if (admin) {
    await startAdminSession();
    redirect("/admin");
  }
  if (!reader) {
    return { error: "Invalid username or password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Lets the page keep this reader's bookmark apart from other readers on the same device.
  cookieStore.set(READER_NAME_COOKIE, username, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(READER_NAME_COOKIE);
  redirect("/login");
}
