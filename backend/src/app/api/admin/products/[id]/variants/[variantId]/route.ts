import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const optionalStr = z
  .string()
  .trim()
  .max(64)
  .transform((v) => (v.length > 0 ? v : null))
  .nullable()
  .optional();

const updateSchema = z.object({
  color: optionalStr,
  size: optionalStr,
  wood: optionalStr,
  priceCents: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const { id, variantId } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const existing = await prisma.productVariant.findFirst({ where: { id: variantId, productId: id } });
    if (!existing) {
      return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
    }

    const data: Record<string, unknown> = {};
    if (body.data.color !== undefined) data.color = body.data.color;
    if (body.data.size !== undefined) data.size = body.data.size;
    if (body.data.wood !== undefined) data.wood = body.data.wood;
    if (body.data.priceCents !== undefined) data.priceCents = body.data.priceCents;
    if (body.data.stock !== undefined) data.stock = body.data.stock;
    if (body.data.active !== undefined) data.active = body.data.active;

    const variant = await prisma.productVariant.update({ where: { id: variantId }, data });
    return withCors(NextResponse.json({ variant }), origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique") || message.includes("UNIQUE")) {
      return withCors(
        NextResponse.json({ error: "Variant with these dimensions already exists" }, { status: 409 }),
        origin,
      );
    }
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const { id, variantId } = await params;

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const existing = await prisma.productVariant.findFirst({ where: { id: variantId, productId: id } });
    if (!existing) {
      return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
    }
    const usedInOrders = await prisma.orderItem.findFirst({ where: { variantId } });
    if (usedInOrders) {
      await prisma.productVariant.update({ where: { id: variantId }, data: { active: false } });
      return withCors(NextResponse.json({ ok: true, softDeleted: true }), origin);
    }
    await prisma.productVariant.delete({ where: { id: variantId } });
    return withCors(NextResponse.json({ ok: true }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}
