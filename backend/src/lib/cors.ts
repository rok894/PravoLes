import { NextResponse } from "next/server";

function getAllowedOrigin(requestOrigin: string | null) {
  const configured = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  if (!requestOrigin) return configured;
  // Allow exact match only to avoid reflecting arbitrary origins.
  return requestOrigin === configured ? requestOrigin : configured;
}

function withCors(
  res: NextResponse,
  requestOrigin: string | null,
  allowMethods = "GET,POST,PATCH,DELETE,OPTIONS",
) {
  res.headers.set("Access-Control-Allow-Origin", getAllowedOrigin(requestOrigin));
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Headers", "content-type, x-csrf-token");
  res.headers.set("Access-Control-Allow-Methods", allowMethods);
  return res;
}

function corsPreflight(requestOrigin: string | null) {
  return withCors(new NextResponse(null, { status: 204 }), requestOrigin);
}

export { corsPreflight, withCors };
