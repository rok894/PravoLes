import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionTokenFromCookie, hashToken } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const token = await getSessionTokenFromCookie();
  await clearSessionCookie();

  if (!token) {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  try {
    const prisma = getPrisma();
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  } catch {
    // Cookie is cleared anyway.
  }

  return withCors(NextResponse.json({ ok: true }), origin);
}

