import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hashToken } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const ip = getClientIp(req);
  if (!checkRateLimit(`reset:${ip}`, 10, 60_000)) {
    return withCors(
      NextResponse.json({ error: "Too many requests." }, { status: 429 }),
      origin,
    );
  }

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const resetToken = await prisma.passwordResetToken
    .findUnique({ where: { tokenHash: hashToken(body.data.token) } })
    .catch(() => null);

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return withCors(
      NextResponse.json({ error: "Token is invalid or has expired." }, { status: 400 }),
      origin,
    );
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      // Invalidate all existing sessions for this user
      prisma.session.deleteMany({
        where: { user: { email: resetToken.email } },
      }),
    ]);
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }

  return withCors(NextResponse.json({ ok: true }), origin);
}
