import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateCartId } from "@/lib/cart";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(99).optional(),
});

const setSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(0).max(99),
});

const removeSchema = z.object({
  productId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
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
    cartId = await getOrCreateCartId();
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }
  const body = addSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { productId, qty } = body.data;
  let product;
  try {
    product = await prisma.product.findFirst({
      where: { id: productId, active: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const increment = qty ?? 1;

  try {
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: {
        cartId,
        productId,
        qty: increment,
      },
      update: {
        qty: { increment },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
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
    cartId = await getOrCreateCartId();
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }
  const body = setSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { productId, qty } = body.data;

  if (qty === 0) {
    try {
      await prisma.cartItem.deleteMany({ where: { cartId, productId } });
    } catch {
      return NextResponse.json(
        { error: "Database is unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.cartItem.updateMany({
      where: { cartId, productId },
      data: { qty },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
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
    cartId = await getOrCreateCartId();
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }
  const body = removeSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    if (body.data.productId) {
      await prisma.cartItem.deleteMany({
        where: { cartId, productId: body.data.productId },
      });
    } else {
      await prisma.cartItem.deleteMany({ where: { cartId } });
    }
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
