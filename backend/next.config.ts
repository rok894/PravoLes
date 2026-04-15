import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// CSP without nonces — matches Next.js 16 "Without Nonces" recipe.
// Next.js emits inline bootstrap/hydration scripts, so script-src needs 'unsafe-inline'.
// Dev also needs 'unsafe-eval' for React's server-error reconstruction.
// Stripe is called server-side, so no external script/frame origins are needed.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    // Avoid repo-root inference when multiple lockfiles exist.
    root: __dirname,
  },
  allowedDevOrigins: ["localhost:5173"],
  async headers() {
    const prodOnly = isProd
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : [];

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...prodOnly],
      },
    ];
  },
};

export default nextConfig;
