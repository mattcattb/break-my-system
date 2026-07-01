import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

import tailwindVite from "@tailwindcss/vite";

export default defineConfig({
  envDir: "../..",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    tailwindVite(),
    TanStackRouterVite({target: "react", autoCodeSplitting: true}),
    react(),
  ],
});
