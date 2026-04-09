import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildGoogleAuthorizeUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "pravoles_google_oauth_state";

export async function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const state = crypto.randomBytes(16).toString("hex");

  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  let url;
  try {
    url = buildGoogleAuthorizeUrl(origin, state);
  } catch {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 500 });
  }

  return NextResponse.redirect(url);
}

