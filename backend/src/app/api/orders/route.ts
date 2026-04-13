import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");

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

  let orders;
  try {
    orders = await prisma.order.findMany({
      where: { customerEmail: user.email },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        payment: true,
      },
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  return withCors(NextResponse.json({ orders }), origin);
}
