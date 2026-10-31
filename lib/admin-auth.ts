import "server-only";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_TOKEN_SUBJECT,
  ADMIN_USER,
  SESSION_MAX_AGE,
  createSessionToken,
  safeEqual,
  verifySessionToken,
} from "./session";

// proxy.ts redirects signed-out visitors away from /admin, but every admin action and route
// checks again here, close to the data, as the proxy alone isn't a security boundary.
export async function isAdmin() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token) === ADMIN_TOKEN_SUBJECT;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in as admin.");
}

// The admin signs in with their username or ID. Every comparison is evaluated so a wrong
// username takes as long as a wrong password.
export function isAdminLogin(username: string, password: string) {
  const byUsername = safeEqual(username, ADMIN_USER.username);
  const byId = safeEqual(username, ADMIN_USER.id);
  const passOk = safeEqual(password, ADMIN_USER.password);
  return (byUsername || byId) && passOk;
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_SESSION_COOKIE, createSessionToken(ADMIN_TOKEN_SUBJECT), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}
