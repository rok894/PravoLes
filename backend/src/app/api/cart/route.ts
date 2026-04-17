import { NextResponse } from "next/server";

import { getOrCreateCartId } from "@/lib/cart";
import { publicProduct } from "@/lib/pricing";
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
          include: { product: true, variant: true },
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

  const items = cart.items.map((item) => {
    const base = publicProduct(item.product);
    const variant = item.variant;
    const unitCents = variant?.priceCents ?? base.priceCents;
    const variantLabel = variant
      ? [variant.wood, variant.size, variant.color].filter(Boolean).join(" · ")
      : null;
    return {
      product: { ...base, priceCents: unitCents },
      variantId: variant?.id ?? null,
      variantLabel,
      variantColor: variant?.color ?? null,
      variantSize: variant?.size ?? null,
      variantWood: variant?.wood ?? null,
      qty: item.qty,
      lineTotalCents: unitCents * item.qty,
    };
  });

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
