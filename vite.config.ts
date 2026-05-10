import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import pkg from "./package.json";

function devConfigJsPlugin(env: Record<string, string>): Plugin {
  return {
    name: "moto-config-js",
    configureServer(server) {
      server.middlewares.use("/config.js", (_req, res) => {
        const cfg = {
          BACKEND_URL: env.BACKEND_URL || "http://localhost:3001",
          ENABLE_REGISTRATION: env.ENABLE_REGISTRATION ?? "true",
          APP_VERSION: pkg.version,
          UMAMI_WEBSITE_ID: env.UMAMI_WEBSITE_ID ?? "",
          UMAMI_SCRIPT_URL: env.UMAMI_SCRIPT_URL ?? "",
        };
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-store");
        res.end(`window.ENV = ${JSON.stringify(cfg)};`);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      "process.env.APP_VERSION": JSON.stringify(pkg.version),
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      devConfigJsPlugin(env),
      reactRouter(),
    ],
  };
});
