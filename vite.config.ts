import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import babel from "vite-plugin-babel";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    babel({
      filter: /\/app\/.*\.[jt]sx?$/,
      babelConfig: {
        presets: [
          ["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
        plugins: [
          ["babel-plugin-react-compiler", { target: "19" }],
        ],
      },
    }),
  ],
});
