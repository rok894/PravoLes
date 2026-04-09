import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import getPrisma from "@/lib/prisma";
import { makeSessionToken, setSessionCookie } from "@/lib/auth";
import { exchangeCodeForTokens, fetchGoogleUserInfo } from "@/lib/google";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "pravoles_google_oauth_state";

function htmlResponse(frontendOrigin: string, ok: boolean, message?: string) {
  const payload = JSON.stringify({
    type: ok ? "auth:success" : "auth:error",
    message: message ?? null,
  });

  const safeOrigin = JSON.stringify(frontendOrigin);

  return new NextResponse(
    `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Auth</title></head>
  <body>
    <script>
      (function () {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(${payload}, ${safeOrigin});
          }
        } catch (e) {}
        window.close();
      })();
    </script>
    <p>${ok ? "OK" : "Error"}</p>
  </body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? url.origin;
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

  if (!code || !state) {
    return htmlResponse(frontendOrigin, false, "Missing code/state");
  }

  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value ?? null;
  store.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });

  if (!expectedState || expectedState !== state) {
    return htmlResponse(frontendOrigin, false, "Invalid state");
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return htmlResponse(frontendOrigin, false, "Database is not configured");
  }

  try {
    const tokenRes = await exchangeCodeForTokens(origin, code);
    const info = await fetchGoogleUserInfo(tokenRes.access_token);

    const email = info.email.trim().toLowerCase();
    const googleSub = info.sub;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        googleSub,
      },
      update: {
        googleSub,
      },
    });

    const token = makeSessionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    await setSessionCookie(token);
    return htmlResponse(frontendOrigin, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth failed";
    return htmlResponse(frontendOrigin, false, msg);
  }
}

