import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

import tailwindVite from "@tailwindcss/vite";

export default defineConfig(({mode}) => {
  const apiProxyTarget =
    loadEnv(mode, "../..", "").API_PROXY_TARGET || "http://localhost:3000";

  const proxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
    },
    "/ws": {
      target: apiProxyTarget,
      changeOrigin: true,
      ws: true,
    },
  };

  return {
    envDir: "../..",
    server: {proxy},
    preview: {proxy},
    plugins: [
      tailwindVite(),
      TanStackRouterVite({target: "react", autoCodeSplitting: true}),
      react(),
    ],
  };
});
