import crypto from "crypto";
import { cookies } from "next/headers";

import getPrisma from "@/lib/prisma";

const SESSION_COOKIE = "pravoles_session";

function makeSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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

  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= now) return null;

  return session.user;
}

export {
  SESSION_COOKIE,
  clearSessionCookie,
  getCurrentUser,
  getSessionTokenFromCookie,
  makeSessionToken,
  setSessionCookie,
};
