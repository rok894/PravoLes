import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SESSION_TTL_MS, hashToken, makeSessionToken, setSessionCookie } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

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
      // Run a dummy bcrypt compare to equalize timing between known and unknown users.
      await bcrypt.compare(body.data.password, "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.iTt9D2r0VGqE9B9gkrCkC0xhC2gu");
      return withCors(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }), origin);
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const retrySec = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
      return withCors(
        NextResponse.json(
          { error: "Account temporarily locked. Try again later." },
          { status: 423, headers: { "Retry-After": String(retrySec) } },
        ),
        origin,
      );
    }

    const ok = await bcrypt.compare(body.data.password, user.passwordHash);
    if (!ok) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: shouldLock ? 0 : attempts,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null,
          },
        });
      } catch (e) {
        console.error("[login] attempt update failed:", e);
      }
      return withCors(NextResponse.json({ error: "Invalid credentials" }, { status: 401 }), origin);
    }

    // Success — reset counters.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
      } catch (e) {
        console.error("[login] reset counters failed:", e);
      }
    }

    const token = makeSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      await prisma.session.create({
        data: { tokenHash, userId: user.id, expiresAt },
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
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }), origin);
  }
}
