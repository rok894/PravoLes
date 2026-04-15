import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { CSRF_COOKIE, CSRF_HEADER, safeEqual } from "@/lib/csrf";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Webhooks authenticate via provider signatures and must be reachable without a CSRF token.
const CSRF_EXEMPT_PREFIXES = ["/api/webhooks/"];

function corsAllowOrigin(requestOrigin: string | null) {
  const configured = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  if (!requestOrigin) return configured;
  return requestOrigin === configured ? requestOrigin : configured;
}

function csrfDenied(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  res.headers.set("Access-Control-Allow-Origin", corsAllowOrigin(origin));
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (!WRITE_METHODS.has(req.method)) return NextResponse.next();
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return csrfDenied(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
