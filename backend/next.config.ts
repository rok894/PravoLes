import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Avoid repo-root inference when multiple lockfiles exist.
    root: __dirname,
  },
  allowedDevOrigins: ["localhost:5173"],
};

export default nextConfig;
