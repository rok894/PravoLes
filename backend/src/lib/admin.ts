import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { withCors } from "@/lib/cors";

type AdminGuardResult =
  | { ok: true; user: { id: string; email: string; role: "ADMIN" } }
  | { ok: false; response: NextResponse };

async function requireAdmin(origin: string | null): Promise<AdminGuardResult> {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return {
      ok: false,
      response: withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin),
    };
  }
  if (!user || user.role !== "ADMIN") {
    return {
      ok: false,
      response: withCors(NextResponse.json({ error: "Forbidden" }, { status: 403 }), origin),
    };
  }
  return { ok: true, user: { id: user.id, email: user.email, role: "ADMIN" } };
}

export { requireAdmin };
