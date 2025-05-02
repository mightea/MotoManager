import { text } from "drizzle-orm/sqlite-core";

export const timestamps = {
  updated_at: text().default(new Date().toISOString()),
  created_at: text().default(new Date().toISOString()),
};
