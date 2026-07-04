import { defineConfig } from "@playwright/test";
import path from "node:path";

// The webapp is a client-only SPA — it has NO database of its own (the previous
// `DB_FILE_NAME` / `db.sqlite.test` wiring was left over from a pre-SPA setup and
// has been removed). To run this suite you must have the **API running** (default
// http://localhost:3001, or set BACKEND_URL) with a seeded test user matching the
// credentials in the specs. The web server below just builds and previews the SPA.
//
//   Run: pnpm exec playwright test
//   (start the API separately first; point the app at it via a served /config.js
//    or the default backend URL.)

const PREVIEW_PORT = 4173; // vite preview default
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PREVIEW_PORT}`;

export default defineConfig({
  testDir: path.resolve(process.cwd(), "tests/e2e"),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    // Build the SPA and serve it with `vite preview` (there is no `start` script).
    command: `pnpm run build && pnpm exec vite preview --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
