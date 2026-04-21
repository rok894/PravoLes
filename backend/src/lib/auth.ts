import crypto from "crypto";
import { cookies } from "next/headers";

import getPrisma from "@/lib/prisma";

const IS_PROD = process.env.NODE_ENV === "production";
const CROSS_SITE = process.env.CROSS_SITE_COOKIES === "true";

// __Host- prefix locks the cookie to the exact host — use it only when frontend and backend share the origin.
// When cross-site (separate Vercel projects), we must use SameSite=None + Secure without the __Host- prefix.
const SESSION_COOKIE = IS_PROD && !CROSS_SITE ? "__Host-pravoles_session" : "pravoles_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const COOKIE_SAME_SITE: "lax" | "none" = CROSS_SITE ? "none" : "lax";
const COOKIE_SECURE = IS_PROD || CROSS_SITE;

function makeSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 0,
  });
}

async function getSessionTokenFromCookie() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

async function getCurrentUser() {
  const prisma = getPrisma();
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    include: { user: true },
  });
  if (!session) return null;

  return session.user;
}

export {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clearSessionCookie,
  getCurrentUser,
  getSessionTokenFromCookie,
  hashToken,
  makeSessionToken,
  setSessionCookie,
};
