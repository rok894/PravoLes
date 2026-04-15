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

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return withCors(NextResponse.json({ messages }), origin);
}

export async function PATCH(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    await prisma.contactMessage.update({
      where: { id: body.id },
      data: { read: true },
    });
    return withCors(NextResponse.json({ ok: true }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
  }
}

export async function DELETE(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    await prisma.contactMessage.delete({ where: { id: body.id } });
    return withCors(NextResponse.json({ ok: true }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
  }
}
