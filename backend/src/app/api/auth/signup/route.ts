import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { SESSION_TTL_MS, hashToken, makeSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const ip = getClientIp(req);
  if (!checkRateLimit(`signup:${ip}`, 5, 60_000)) {
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
      console.error("[signup] getPrisma failed:", e);
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
    const passwordHash = await bcrypt.hash(body.data.password, 12);

    let user;
    try {
      user = await prisma.user.create({ data: { email, passwordHash } });
    } catch (e) {
      console.error("[signup] user.create failed:", e);
      return withCors(
        NextResponse.json({ error: "Email already in use" }, { status: 409 }),
        origin,
      );
    }

    const token = makeSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      await prisma.session.create({
        data: { tokenHash, userId: user.id, expiresAt },
      });
    } catch (e) {
      console.error("[signup] session.create failed:", e);
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
    console.error("[signup] unhandled error:", e);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }), origin);
  }
}
