import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    define: {
      "process.env.APP_VERSION": JSON.stringify(pkg.version),
      "process.env.BACKEND_URL": JSON.stringify(env.BACKEND_URL),
      "process.env.ENABLE_REGISTRATION": JSON.stringify(env.ENABLE_REGISTRATION),
    },
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
