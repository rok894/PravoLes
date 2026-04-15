import crypto from "crypto";
import { cookies } from "next/headers";

import getPrisma from "@/lib/prisma";

const IS_PROD = process.env.NODE_ENV === "production";

// __Host- prefix in production locks the cookie to the exact host, requires Secure, path=/ and no Domain.
const SESSION_COOKIE = IS_PROD ? "__Host-pravoles_session" : "pravoles_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

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
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
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
