import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { makeSessionToken, setSessionCookie } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const ip = getClientIp(req);
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return withCors(
      NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 }),
      origin,
    );
  }

  try {
    let prisma;
    try {
      prisma = getPrisma();
    } catch (e) {
      console.error("[login] getPrisma failed:", e);
      return withCors(
        NextResponse.json({ error: "Database is not configured" }, { status: 500 }),
        origin,
      );
    }

    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
    }

    const email = body.data.email.trim().toLowerCase();

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (e) {
      console.error("[login] findUnique failed:", e);
      return withCors(
        NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
        origin,
      );
    }

    if (!user) {
      return withCors(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }), origin);
    }

    const ok = await bcrypt.compare(body.data.password, user.passwordHash);
    if (!ok) {
      return withCors(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }), origin);
    }

    const token = makeSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    try {
      await prisma.session.create({
        data: { token, userId: user.id, expiresAt },
      });
    } catch (e) {
      console.error("[login] session.create failed:", e);
      return withCors(
        NextResponse.json({ error: "Failed to create session" }, { status: 500 }),
        origin,
      );
    }

    await setSessionCookie(token);

    return withCors(
      NextResponse.json({ user: { id: user.id, email: user.email } }),
      origin,
    );
  } catch (e) {
    console.error("[login] unhandled error:", e);
    const msg = process.env.NODE_ENV !== "production" && e instanceof Error ? e.message : "Internal server error";
    return withCors(NextResponse.json({ error: msg }, { status: 500 }), origin);
  }
}
