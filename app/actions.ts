"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminLogin, startAdminSession } from "@/lib/admin-auth";
import {
  DEMO_USER,
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

  // Evaluate every check so a wrong username takes as long as a wrong password.
  const userOk = safeEqual(username, DEMO_USER.username);
  const passOk = safeEqual(password, DEMO_USER.password);
  const admin = isAdminLogin(username, password);

  // The admin can sign in here too; they go to the admin area.
  if (admin) {
    await startAdminSession();
    redirect("/admin");
  }
  if (!userOk || !passOk) {
    return { error: "Invalid username or password." };
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
