import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { checkRateLimitDetailed, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().max(200).trim(),
  message: z.string().min(5).max(2000).trim(),
  website: z.string().max(200).optional(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const ip = getClientIp(req);
  const limit = checkRateLimitDetailed(`contact:${ip}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    const res = NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return withCors(
      res,
      origin,
    );
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is not configured" }, { status: 500 }),
      origin,
    );
  }

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(
      NextResponse.json({ error: "Invalid body" }, { status: 400 }),
      origin,
    );
  }

  // Honeypot: bots fill hidden fields, humans leave them empty
  if (body.data.website?.trim()) {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  try {
    await prisma.contactMessage.create({
      data: {
        name: body.data.name,
        email: body.data.email,
        message: body.data.message,
      },
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  return withCors(NextResponse.json({ ok: true }), origin);
}
