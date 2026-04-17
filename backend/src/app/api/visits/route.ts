import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { classifySource } from "@/lib/visitSource";
import { classifyDevice, detectCountry } from "@/lib/visitMeta";

export const dynamic = "force-dynamic";

const schema = z.object({
  referrer: z.string().max(500).optional().nullable(),
  path: z.string().max(500).optional().nullable(),
  source: z.string().max(40).optional().nullable(),
  sessionId: z.string().min(8).max(64).optional().nullable(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const ip = getClientIp(req);

  if (!checkRateLimit(`visit:${ip}`, 30, 60_000)) {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  const referrer = body.data.referrer?.slice(0, 500) ?? null;
  const path = body.data.path?.slice(0, 500) ?? null;
  const source = classifySource(referrer, body.data.source ?? null);
  const sessionId = body.data.sessionId?.slice(0, 64) ?? null;
  const device = classifyDevice(req.headers.get("user-agent"));
  const country = detectCountry(req.headers);

  try {
    await prisma.visit.create({
      data: { source, referrer, path, sessionId, device, country },
    });
  } catch {
    // analytics is best-effort
  }

  return withCors(NextResponse.json({ ok: true }), origin);
}
