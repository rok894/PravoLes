import { cookies } from "next/headers";

import getPrisma from "./prisma";

const CART_COOKIE = "pravoles_cart_id";

function readSessionId(headers: Headers): string | null {
  const v = headers.get("x-session-id");
  if (!v) return null;
  const trimmed = v.trim().slice(0, 64);
  return trimmed.length >= 8 ? trimmed : null;
}

async function getOrCreateCartId(headers?: Headers): Promise<string> {
  const prisma = getPrisma();
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;

  if (existing) {
    const cart = await prisma.cart.findUnique({ where: { id: existing } });
    if (cart) {
      if (headers) {
        const sid = readSessionId(headers);
        if (sid && !cart.sessionId) {
          await prisma.cart.update({
            where: { id: existing },
            data: { sessionId: sid, source: await inferSourceFromSession(sid) },
          });
        }
      }
      return existing;
    }
  }

  const sid = headers ? readSessionId(headers) : null;
  const source = sid ? await inferSourceFromSession(sid) : null;

  const cart = await prisma.cart.create({
    data: { sessionId: sid, source },
  });
  store.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

async function inferSourceFromSession(sessionId: string): Promise<string | null> {
  try {
    const prisma = getPrisma();
    const visit = await prisma.visit.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { source: true },
    });
    return visit?.source ?? null;
  } catch {
    return null;
  }
}

export { CART_COOKIE, getOrCreateCartId, readSessionId };
