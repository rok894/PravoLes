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

const createSchema = z.object({
  color: optionalStr,
  size: optionalStr,
  wood: optionalStr,
  priceCents: z.number().int().min(0),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
    });
    return withCors(NextResponse.json({ variants }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return withCors(NextResponse.json({ error: "Product not found" }, { status: 404 }), origin);
  }

  const { color, size, wood, priceCents, stock, active } = body.data;
  if (color == null && size == null && wood == null) {
    return withCors(
      NextResponse.json({ error: "Variant needs at least one dimension" }, { status: 400 }),
      origin,
    );
  }

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        color: color ?? null,
        size: size ?? null,
        wood: wood ?? null,
        priceCents,
        stock,
        active,
      },
    });
    return withCors(NextResponse.json({ variant }), origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique") || message.includes("UNIQUE")) {
      return withCors(
        NextResponse.json({ error: "Variant with these dimensions already exists" }, { status: 409 }),
        origin,
      );
    }
    if (message.includes("no such table") || message.includes("no such column")) {
      return withCors(
        NextResponse.json(
          { error: "Database schema is out of date. Run prisma migrate/generate and restart the server." },
          { status: 500 },
        ),
        origin,
      );
    }
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}
