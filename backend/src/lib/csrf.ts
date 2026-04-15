import crypto from "crypto";

const IS_PROD = process.env.NODE_ENV === "production";

// __Host- prefix forces Secure + path=/ + no Domain, preventing subdomain injection.
const CSRF_COOKIE = IS_PROD ? "__Host-pravoles_csrf" : "pravoles_csrf";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TTL_SECONDS = 60 * 60 * 24 * 7;

function makeCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Constant-time compare to avoid timing leaks.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

export { CSRF_COOKIE, CSRF_HEADER, CSRF_TTL_SECONDS, makeCsrfToken, safeEqual };
