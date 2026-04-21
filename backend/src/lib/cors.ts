import { NextResponse } from "next/server";

function getConfiguredOrigins() {
  const raw = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedOrigin(requestOrigin: string | null) {
  const configured = getConfiguredOrigins();
  const fallback = configured[0] ?? "http://localhost:5173";
  if (!requestOrigin) return fallback;
  // Allow exact match only to avoid reflecting arbitrary origins.
  return configured.includes(requestOrigin) ? requestOrigin : fallback;
}

function withCors(
  res: NextResponse,
  requestOrigin: string | null,
  allowMethods = "GET,POST,PATCH,DELETE,OPTIONS",
) {
  res.headers.set("Access-Control-Allow-Origin", getAllowedOrigin(requestOrigin));
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Headers", "content-type, x-csrf-token, x-session-id");
  res.headers.set("Access-Control-Allow-Methods", allowMethods);
  return res;
}

function corsPreflight(requestOrigin: string | null) {
  return withCors(new NextResponse(null, { status: 204 }), requestOrigin);
}

export { corsPreflight, withCors };
