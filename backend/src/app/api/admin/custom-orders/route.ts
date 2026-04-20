import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["SUBMITTED", "QUOTED", "ACCEPTED", "PAID", "REJECTED", "CANCELED"]);

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status && STATUSES.has(status)) {
    where.status = status;
  }

  try {
    const requests = await prisma.customOrderRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { id: true, path: true, mimeType: true, sizeBytes: true } },
        payment: true,
      },
    });
    return withCors(NextResponse.json({ requests }), origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("no such table") || message.includes("customOrderRequest")) {
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
