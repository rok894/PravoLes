import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateCartId } from "@/lib/cart";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().nullable(),
  qty: z.number().int().min(1).max(99).optional(),
});

const setSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().nullable(),
  qty: z.number().int().min(0).max(99),
});

const removeSchema = z.object({
  productId: z.string().min(1).optional(),
  variantId: z.string().min(1).optional().nullable(),
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
    cartId = await getOrCreateCartId(req.headers);
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

  const { productId } = body.data;
  const variantId = body.data.variantId ?? null;
  let product;
  try {
    product = await prisma.product.findFirst({
      where: { id: productId, active: true },
      include: { variants: { where: { active: true }, select: { id: true } } },
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

  const hasVariants = product.variants.length > 0;
  if (hasVariants && !variantId) {
    return NextResponse.json({ error: "Select a variant" }, { status: 400 });
  }
  if (!hasVariants && variantId) {
    return NextResponse.json({ error: "Product has no variants" }, { status: 400 });
  }

  let variant: { id: string; stock: number; active: boolean; productId: string } | null = null;
  if (variantId) {
    try {
      variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    } catch {
      return NextResponse.json({ error: "Database is unavailable" }, { status: 503 });
    }
    if (!variant || variant.productId !== productId || !variant.active) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
  }

  const increment = body.data.qty ?? 1;

  try {
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId, productId, variantId } },
      select: { qty: true },
    });
    const newQty = (existing?.qty ?? 0) + increment;

    if (variant && newQty > variant.stock) {
      return NextResponse.json(
        { error: `Only ${variant.stock} in stock` },
        { status: 400 },
      );
    }

    await prisma.cartItem.upsert({
      where: { cartId_productId_variantId: { cartId, productId, variantId } },
      create: { cartId, productId, variantId, qty: increment },
      update: { qty: newQty },
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
    cartId = await getOrCreateCartId(req.headers);
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
  const variantId = body.data.variantId ?? null;

  if (qty === 0) {
    try {
      await prisma.cartItem.deleteMany({ where: { cartId, productId, variantId } });
    } catch {
      return NextResponse.json(
        { error: "Database is unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (variantId) {
    try {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true, productId: true, active: true },
      });
      if (!variant || variant.productId !== productId || !variant.active) {
        return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      }
      if (qty > variant.stock) {
        return NextResponse.json({ error: `Only ${variant.stock} in stock` }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Database is unavailable" }, { status: 503 });
    }
  }

  try {
    await prisma.cartItem.updateMany({
      where: { cartId, productId, variantId },
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
    cartId = await getOrCreateCartId(req.headers);
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
      const where: { cartId: string; productId: string; variantId?: string | null } = {
        cartId,
        productId: body.data.productId,
      };
      if (body.data.variantId !== undefined) where.variantId = body.data.variantId ?? null;
      await prisma.cartItem.deleteMany({ where });
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
