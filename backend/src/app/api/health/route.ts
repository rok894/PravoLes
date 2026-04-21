import { NextResponse } from "next/server";

import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, db: { ok: false, error: "Missing DATABASE_URL" } },
      { status: 500 },
    );
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return NextResponse.json(
      { ok: false, db: { ok: false, error: "Prisma init failed" } },
      { status: 500 },
    );
  }

  try {
    // Lightweight connectivity check.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: { ok: true } });
  } catch (err) {
    const debug = process.env.HEALTH_DEBUG === "true";
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        db: { ok: false, error: "Database is unavailable", ...(debug ? { detail: message } : {}) },
      },
      { status: 503 },
    );
  }
}

