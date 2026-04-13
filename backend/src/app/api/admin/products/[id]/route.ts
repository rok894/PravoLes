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

const updateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(2000).trim().optional(),
  image: z.string().min(1).max(500).trim().optional(),
  alt: z.string().min(1).max(300).trim().optional(),
  priceCents: z.number().int().min(1).optional(),
  currency: z.string().length(3).optional(),
  active: z.boolean().optional(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const { error } = await requireAdmin(origin);
  if (error) return error;

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const product = await prisma.product.update({ where: { id }, data: body.data });
    return withCors(NextResponse.json({ product }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "Not found or DB unavailable" }, { status: 404 }), origin);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const { error } = await requireAdmin(origin);
  if (error) return error;

  const { id } = await params;

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    await prisma.product.update({ where: { id }, data: { active: false } });
    return withCors(NextResponse.json({ ok: true }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "Not found or DB unavailable" }, { status: 404 }), origin);
  }
}
