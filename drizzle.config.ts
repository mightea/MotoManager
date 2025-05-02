import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite", // 'mysql' | 'sqlite' | 'turso'
  schema: "./app/db/schema.ts",
  out: "./app/db/drizzle",
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});
