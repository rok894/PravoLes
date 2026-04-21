import crypto from "crypto";

const IS_PROD = process.env.NODE_ENV === "production";
const CROSS_SITE = process.env.CROSS_SITE_COOKIES === "true";

// __Host- prefix forces Secure + path=/ + no Domain, preventing subdomain injection.
// Drop the prefix when running cross-site — browsers will reject __Host- cookies sent with SameSite=None across origins.
const CSRF_COOKIE = IS_PROD && !CROSS_SITE ? "__Host-pravoles_csrf" : "pravoles_csrf";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TTL_SECONDS = 60 * 60 * 24 * 7;
const CSRF_SAME_SITE: "lax" | "none" = CROSS_SITE ? "none" : "lax";
const CSRF_SECURE = IS_PROD || CROSS_SITE;

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

export {
  CSRF_COOKIE,
  CSRF_HEADER,
  CSRF_SAME_SITE,
  CSRF_SECURE,
  CSRF_TTL_SECONDS,
  makeCsrfToken,
  safeEqual,
};
