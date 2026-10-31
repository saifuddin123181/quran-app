import { createHmac, timingSafeEqual } from "node:crypto";

// Hard-coded demo credentials. Replace with a real user store before production.
export const DEMO_USER = {
  username: "Saif",
  password: "Saif123",
};

// Hard-coded admin account for /admin (uploading recitations). Set ADMIN_PASSWORD in the
// environment (e.g. on Vercel) to override the default password without changing code.
export const ADMIN_USER = {
  id: "admin-01",
  username: "admin",
  password: process.env.ADMIN_PASSWORD ?? "Admin@123",
};

export const SESSION_COOKIE = "session";
export const ADMIN_SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day, in seconds

// Admin tokens are signed for "admin:<id>", so a reader's token can never pass as an admin's.
export const ADMIN_TOKEN_SUBJECT = `admin:${ADMIN_USER.id}`;

const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-change-me";

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Token format: "<username>.<expiresAt>.<signature>"
export function createSessionToken(username: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${username}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the username if the token is valid and unexpired, otherwise null.
export function verifySessionToken(token: string | undefined) {
  if (!token) return null;

  const [username, expiresAt, signature] = token.split(".");
  if (!username || !expiresAt || !signature) return null;
  if (!safeEqual(signature, sign(`${username}.${expiresAt}`))) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return username;
}
