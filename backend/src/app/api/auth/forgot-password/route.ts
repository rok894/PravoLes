import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/cors";
import { sendEmail, passwordResetHtml } from "@/lib/email";
import getPrisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(200).trim(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const ip = getClientIp(req);
  if (!checkRateLimit(`forgot:${ip}`, 3, 10 * 60_000)) {
    return withCors(
      NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 }),
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

  const email = body.data.email.toLowerCase();

  // Always return ok — don't leak whether email exists
  const user = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (!user) {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  try {
    await prisma.passwordResetToken.create({ data: { token, email, expiresAt } });
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }

  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  const resetUrl = `${frontendOrigin}/?reset_token=${token}`;

  await sendEmail(email, "Ponastavitev gesla — PravoLes", passwordResetHtml(resetUrl));

  return withCors(NextResponse.json({ ok: true }), origin);
}
