import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Passwords never live in the code (the repository is public). They come from environment
// variables: Vercel project settings in production, .env.local (not committed) on your computer.
// See .env.example. A missing setting turns that login off rather than falling back to anything.

// READER_ACCOUNTS="Saif:password1,Bushra:password2" (username:password pairs, comma-separated;
// a password can't contain a comma).
function parseAccounts(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => {
      const colon = entry.indexOf(":");
      return { username: entry.slice(0, colon).trim(), password: entry.slice(colon + 1) };
    })
    .filter((account) => account.username && account.password);
}

export const READER_USERS = parseAccounts(process.env.READER_ACCOUNTS);

// Admin account for /admin (uploading recitations). Signs in with the username or the ID.
export const ADMIN_USER = {
  id: "admin-01",
  username: "admin",
  password: process.env.ADMIN_PASSWORD ?? "",
};

export const SESSION_COOKIE = "session";
export const ADMIN_SESSION_COOKIE = "admin_session";
// Who is signed in, readable by the page so each reader's "continue reading" bookmark is kept
// separately in the browser (lib/resume.ts). Not used for access control: that's the signed,
// httpOnly session cookies above.
export const READER_NAME_COOKIE = "reader";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day, in seconds

// Admin tokens are signed for "admin:<id>", so a reader's token can never pass as an admin's.
export const ADMIN_TOKEN_SUBJECT = `admin:${ADMIN_USER.id}`;

// Signs session cookies. In production a missing SESSION_SECRET gets a random per-process value,
// so sign-in simply doesn't work until it's set, instead of using a guessable secret.
const SECRET =
  process.env.SESSION_SECRET ??
  (process.env.NODE_ENV === "production" ? randomBytes(32).toString("hex") : "dev-only-secret-change-me");

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
