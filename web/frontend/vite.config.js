import { defineConfig, loadEnv } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = Number(env.FRONTEND_PORT || 3001);
  const backendOrigin = env.BACKEND_ORIGIN || env.HOST;

  if (env.npm_lifecycle_event === "build" && !env.CI && !env.VITE_SHOPIFY_API_KEY) {
    console.warn(
      "\nBuilding the frontend app without a VITE_SHOPIFY_API_KEY. Set VITE_SHOPIFY_API_KEY when running the build command.\n"
    );
  }

  const hostName = env.HOST ? env.HOST.replace(/https?:\/\//, "") : undefined;
  const hmrConfig = hostName
    ? {
        protocol: "wss",
        host: hostName,
        port: frontendPort,
        clientPort: 443,
      }
    : undefined;

  const proxy =
    mode === "development" && backendOrigin
      ? {
          "^/(\\?.*)?$": {
            target: backendOrigin,
            changeOrigin: false,
            secure: backendOrigin.startsWith("https://"),
            ws: false,
          },
          "^/api(/|(\\?.*)?$)": {
            target: backendOrigin,
            changeOrigin: false,
            secure: backendOrigin.startsWith("https://"),
            ws: false,
          },
        }
      : undefined;

  return {
    root: dirname(fileURLToPath(import.meta.url)),
    plugins: [react()],
    optimizeDeps: {
      include: ["@shopify/app-bridge", "@shopify/app-bridge-react", "@shopify/app-bridge-core"],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    resolve: {
      preserveSymlinks: true,
    },
    server: {
      host: true,
      port: frontendPort,
      hmr: hmrConfig,
      proxy,
    },
  };
});
