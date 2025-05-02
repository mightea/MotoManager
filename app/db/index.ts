import { drizzle } from "drizzle-orm/libsql/node";
import * as schema from "./schema";

const db = drizzle(process.env.DATABASE_URL ?? "file:db.sqlite", {
  schema,
});
export default db;
