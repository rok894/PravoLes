import { NextResponse } from "next/server";

import { getOrCreateCartId } from "@/lib/cart";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 500 },
    );
  }

  let cartId;
  try {
    cartId = await getOrCreateCartId(req.headers);
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  let cart;
  try {
    cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  if (!cart) {
    return NextResponse.json(
      { error: "Cart not found" },
      { status: 404 },
    );
  }

  const items = cart.items.map((item) => ({
    product: item.product,
    qty: item.qty,
    lineTotalCents: item.product.priceCents * item.qty,
  }));

  const totalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);

  return NextResponse.json({
    cart: {
      id: cart.id,
      status: cart.status,
      items,
      totalCents,
      currency: items[0]?.product.currency ?? "EUR",
    },
  });
}
