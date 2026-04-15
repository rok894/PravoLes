import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/cors";
import { CSRF_COOKIE, CSRF_TTL_SECONDS, makeCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const store = await cookies();

  let token = store.get(CSRF_COOKIE)?.value;
  if (!token || token.length !== 64) {
    token = makeCsrfToken();
    store.set(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CSRF_TTL_SECONDS,
    });
  }

  return withCors(NextResponse.json({ token }), origin);
}
