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
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : null;
    return NextResponse.json(
      {
        ok: false,
        db: { ok: false, error: "Database is unavailable" },
        _debug: {
          message,
          stack: stack?.split("\n").slice(0, 5),
          hasUrl: Boolean(process.env.DATABASE_URL),
          hasToken: Boolean(process.env.DATABASE_AUTH_TOKEN),
          urlScheme: process.env.DATABASE_URL?.split(":")[0],
        },
      },
      { status: 503 },
    );
  }
}

