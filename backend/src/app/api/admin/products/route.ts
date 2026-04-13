import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "rok.otolani@gmail.com";

async function requireAdmin(origin: string | null) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return { error: withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin) };
  }
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: withCors(NextResponse.json({ error: "Forbidden" }, { status: 403 }), origin) };
  }
  return { user };
}

const createSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(2000).trim(),
  image: z.string().min(1).max(500).trim(),
  alt: z.string().min(1).max(300).trim(),
  priceCents: z.number().int().min(1),
  currency: z.string().length(3).default("EUR"),
  active: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const { error } = await requireAdmin(origin);
  if (error) return error;

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return withCors(NextResponse.json({ products }), origin);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const { error } = await requireAdmin(origin);
  if (error) return error;

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
