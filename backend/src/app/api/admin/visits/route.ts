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

  try {
    const allVisits = await prisma.visit.findMany({
      select: { source: true, createdAt: true },
    });
    const visits = allVisits.filter((v) => new Date(v.createdAt) >= since);
    const counts: Record<string, number> = {};
    for (const v of visits) {
      counts[v.source] = (counts[v.source] ?? 0) + 1;
    }
    const total = visits.length;
    const sources = Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return withCors(NextResponse.json({ days, total, sources }), origin);
  } catch (err) {
    console.error("[visits] query error:", String(err));
    return withCors(NextResponse.json({ error: String(err) }, { status: 500 }), origin);
  }
}
