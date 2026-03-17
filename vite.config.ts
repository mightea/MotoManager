import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.BACKEND_URL || "http://127.0.0.1:3001";

  return {
    define: {
      "process.env.APP_VERSION": JSON.stringify(pkg.version),
      "process.env.BACKEND_URL": JSON.stringify(backendUrl),
      "process.env.ENABLE_REGISTRATION": JSON.stringify(env.ENABLE_REGISTRATION),
    },
    server: {
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/auth": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
