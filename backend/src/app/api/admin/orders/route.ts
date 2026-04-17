import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status && ["PENDING", "PAID", "CANCELED"].includes(status)) {
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      payment: true,
    },
  });

  return withCors(NextResponse.json({ orders }), origin);
}

export async function PATCH(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  if (!["PENDING", "PAID", "CANCELED"].includes(body.status)) {
    return withCors(NextResponse.json({ error: "Invalid status" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const order = await prisma.order.update({
      where: { id: body.id },
      data: { status: body.status },
      include: { items: true, payment: true },
    });
    return withCors(NextResponse.json({ order }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
  }
}
