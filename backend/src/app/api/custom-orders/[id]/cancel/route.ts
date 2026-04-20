import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const { id } = await params;

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is not configured" }, { status: 500 }),
      origin,
    );
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  if (!user) {
    return withCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin,
    );
  }

  let request;
  try {
    request = await prisma.customOrderRequest.findUnique({ where: { id } });
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  if (!request) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
  }

  const ownsRequest =
    (request.userId && request.userId === user.id) ||
    request.email.toLowerCase() === user.email.toLowerCase();

  if (!ownsRequest) {
    return withCors(NextResponse.json({ error: "Forbidden" }, { status: 403 }), origin);
  }

  if (request.status === "PAID") {
    return withCors(
      NextResponse.json({ error: "Cannot cancel a paid request." }, { status: 400 }),
      origin,
    );
  }

  try {
    await prisma.customOrderRequest.update({
      where: { id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  return withCors(NextResponse.json({ ok: true }), origin);
}
