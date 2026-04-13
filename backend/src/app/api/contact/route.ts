import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().max(200).trim(),
  message: z.string().min(5).max(2000).trim(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

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
