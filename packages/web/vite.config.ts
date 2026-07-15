import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

import tailwindVite from "@tailwindcss/vite";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, "../..", "");
  const apiProxyTarget =
    env.API_PROXY_TARGET || "http://localhost:3000";

  const allowedHosts = [
    env.RAILWAY_PUBLIC_DOMAIN,
    ...(env.WEB_ALLOWED_HOSTS || "").split(",").map((host) => host.trim()),
  ].filter((host): host is string => Boolean(host));

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
    server: {proxy, allowedHosts},
    preview: {proxy, allowedHosts},
    plugins: [
      tailwindVite(),
      TanStackRouterVite({target: "react", autoCodeSplitting: true}),
      react(),
    ],
  };
});
