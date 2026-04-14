import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Avoid repo-root inference when multiple lockfiles exist.
    root: __dirname,
  },
  allowedDevOrigins: ["localhost:5173"],
  async headers() {
    const prodOnly = process.env.NODE_ENV === "production"
      ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
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
