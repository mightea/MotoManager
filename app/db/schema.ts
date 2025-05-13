import * as t from "drizzle-orm/sqlite-core";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.helpers";

export const locations = sqliteTable("locations", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const currentLocation = sqliteTable("current_location", {
  id: int().primaryKey({ autoIncrement: true }),
  motorcycleId: int("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  date: text().notNull().default(new Date().toISOString()),
  name: text().notNull(),
});

export const motorcycles = sqliteTable("motorcycles", {
  id: int().primaryKey({ autoIncrement: true }),
  make: text().notNull(),
  model: text().notNull(),

  vin: text().notNull(),
  vehicleIdNr: text().notNull(),

  licenseType: t.text().$type<"regular" | "veteran">().default("regular"),

  firstRegistration: text().notNull(),
  lastInspection: text(),

  initialOdo: int().notNull().default(0),

  ...timestamps,
});

export type Location = typeof locations.$inferSelect;
export type CurrentLocation = typeof currentLocation.$inferSelect;

export type Motorcycle = typeof motorcycles.$inferSelect;
export type NewMotorcycle = typeof motorcycles.$inferInsert;
export type EditorMotorcycle = Partial<NewMotorcycle>;
