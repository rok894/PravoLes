import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      // Dev-only: proxy backend routes so auth cookies are same-origin.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/checkout": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
