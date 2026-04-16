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
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.visit.groupBy({
    by: ["source"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const sources = grouped
    .map((g) => ({ source: g.source, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return withCors(NextResponse.json({ days, total, sources }), origin);
}
