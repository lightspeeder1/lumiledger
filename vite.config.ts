import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const isTest = mode === "test";
  return {
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      ...(!isTest
        ? [
            tanstackStart({
              server: { entry: "server" },
              importProtection: {
                behavior: "error",
                client: {
                  files: ["**/server/**"],
                  specifiers: ["server-only"],
                },
              },
            }),
          ]
        : []),
      ...(command === "build" && !isTest
        ? [
            nitro({
              defaultPreset: process.env.NITRO_PRESET || "cloudflare-module",
            }),
          ]
        : []),
      react(),
    ],
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    build: {
      rolloutOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("/@supabase/")) return "vendor-supabase";
            if (id.includes("/@tanstack/")) return "vendor-tanstack";
            if (id.includes("/recharts/") || id.includes("/d3-")) return "vendor-charts";
            if (id.includes("/@radix-ui/")) return "vendor-radix";
            if (/\\/node_modules\\/(react|react-dom|scheduler)\\//.test(id)) return "vendor-react";
            return undefined;
          },
        },
      },
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/": {
          target: process.env.LUMI_API_PROXY_TARGET || "http://127.0.0.1:3001",
          changeOrigin: false,
        },
      },
    },
    test: {
      include: ["tests/**/*.test.{ts,tsx}"],
      exclude: ["tests/e2e/**", "node_modules/**", ".foglamp/**", "brag-output/**"],
      environment: "jsdom",
      restoreMocks: true,
    },
  };
});