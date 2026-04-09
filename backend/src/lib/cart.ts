import { cookies } from "next/headers";

import getPrisma from "./prisma";

const CART_COOKIE = "pravoles_cart_id";

async function getOrCreateCartId(): Promise<string> {
  const prisma = getPrisma();
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) {
    const cart = await prisma.cart.findUnique({ where: { id: existing } });
    if (cart) return existing;
  }

  const cart = await prisma.cart.create({ data: {} });
  store.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

export { CART_COOKIE, getOrCreateCartId };
