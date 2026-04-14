import { NextResponse } from "next/server";

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

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return withCors(NextResponse.json({ messages }), origin);
}

export async function PATCH(req: Request) {
  const origin = req.headers.get("origin");
  const { error } = await requireAdmin(origin);
  if (error) return error;

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
  const { error } = await requireAdmin(origin);
  if (error) return error;

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
