import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const user = await getCurrentUser();
    return withCors(
      NextResponse.json({
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
      }),
      origin,
    );
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }
}

