import { int, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
  date: text("date").notNull(), // SQLite DATE stored as TEXT
  name: text().notNull(),
});

export const motorcycles = sqliteTable("motorcycle", {
  id: int().primaryKey({ autoIncrement: true }),
  make: text().notNull(),
  model: text().notNull(),
  modelYear: int().notNull().default(new Date().getFullYear()), // e.g. 2023

  vin: text().notNull(),
  vehicleIdNr: text().notNull(),
  numberPlate: text().notNull(),

  image: text(),

  isVeteran: integer("is_veteran", { mode: "boolean" })
    .notNull()
    .default(false),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),

  firstRegistration: text().notNull(),
  lastInspection: text(),

  initialOdo: int().notNull().default(0),
  purchaseDate: text().notNull(), // SQLite DATE stored as TEXT
  purchasePrice: real().notNull(), // decimal‐friendly REAL column

  ...timestamps,
});

export type MaintenanceType =
  | "tire"
  | "battery"
  | "engineoil"
  | "gearboxoil"
  | "forkoil"
  | "breakfluid"
  | "brakepad"
  | "chain"
  | "brakerotor"
  | "other";

// 2) Shared “maintenance” table
export const maintenance = sqliteTable("maintenance_record", {
  id: int().primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // SQLite DATE stored as TEXT
  odo: integer("odo").notNull(),
  motorcycleId: integer("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  cost: real("cost").notNull(), // decimal‐friendly REAL column
  currency: text("currency").notNull(), // e.g. "CHF", "EUR", "USD"
  description: text("description"), // optional notes
  type: text("type").notNull(), // discriminator
});

export type TirePosition = "front" | "rear" | "sidecar";

export const maintenanceTires = sqliteTable("maintenance_tire", {
  maintenanceId: integer("maintenance_id")
    .primaryKey()
    .references(() => maintenance.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  size: text("size").notNull(), // e.g. "120/70ZR17"
  position: text("position").notNull().$type<TirePosition>(), // TS‐only safety
  dotCode: text("dot_code").notNull(), // DOT date code
});

export type BatteryType = "lead-acid" | "gel" | "agm" | "lithium-ion" | "other";

export const maintenanceBattery = sqliteTable("maintenance_battery", {
  maintenanceId: integer("maintenance_id")
    .primaryKey()
    .references(() => maintenance.id),
  type: text("battery_type").notNull().$type<BatteryType>(), // TS‐only safety
  manufacturer: text("manufacturer").notNull(),
  model: text("model").notNull(),
});

export const maintenanceFluids = sqliteTable("maintenance_fluid", {
  maintenanceId: integer("maintenance_id")
    .primaryKey()
    .references(() => maintenance.id),
  brand: text("brand").notNull(),
  type: text("fluid_type").notNull().$type<MaintenanceType>(), // TS‐only safety
  viscosity: text("viscosity"), // e.g. "10W40"
});

export const maintenanceBreakpads = sqliteTable("maintenance_breakpads", {
  maintenanceId: integer("maintenance_id")
    .primaryKey()
    .references(() => maintenance.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  position: text("position").notNull().$type<TirePosition>(), // TS‐only safety
});

export const issues = sqliteTable("issues", {
  id: int().primaryKey({ autoIncrement: true }),
  motorcycleId: int("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  odo: integer("odo").notNull(),
  description: text("description").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["open", "in_progress", "done"] })
    .notNull()
    .default("open"),
  date: text("date").notNull(), // SQLite DATE stored as TEXT
  ...timestamps,
});

export type Location = typeof locations.$inferSelect;
export type CurrentLocation = typeof currentLocation.$inferSelect;

export type Motorcycle = typeof motorcycles.$inferSelect;
export type NewMotorcycle = typeof motorcycles.$inferInsert;
export type EditorMotorcycle = Partial<NewMotorcycle>;

export type Maintenance = typeof maintenance.$inferSelect;

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type EditorIssue = Partial<NewIssue>;
