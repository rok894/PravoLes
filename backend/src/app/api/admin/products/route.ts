import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(2000).trim(),
  image: z.string().min(1).max(500).trim(),
  alt: z.string().min(1).max(300).trim(),
  priceCents: z.number().int().min(1),
  currency: z.string().length(3).default("EUR"),
  active: z.boolean().default(true),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return withCors(NextResponse.json({ products }), origin);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const product = await prisma.product.create({ data: body.data });
    return withCors(NextResponse.json({ product }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}
