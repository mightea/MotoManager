import { sql } from "drizzle-orm";
import { int, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const motorcycles = sqliteTable("motorcycles", {
  id: int().primaryKey({ autoIncrement: true }),
  make: text().notNull(),
  model: text().notNull(),
  modelYear: int("model_year"),

  vin: text().notNull(),
  vehicleIdNr: text("vehicle_nr"),
  numberPlate: text("number_plate"),

  image: text(),

  isVeteran: integer("is_veteran", { mode: "boolean" })
    .notNull()
    .default(false),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),

  firstRegistration: text(),
  lastInspection: text(),

  initialOdo: int().notNull().default(0),
  manualOdo: int("manual_odo").default(0), // for manual adjustments

  purchaseDate: text("purchase_date"), // SQLite DATE stored as TEXT
  purchasePrice: real("purchase_price"), // decimal‐friendly REAL column
});

export type MaintenanceType =
  | "tire"
  | "battery"
  | "brakepad"
  | "chain"
  | "brakerotor"
  | "fluid"
  | "general"
  | "repair"
  | "service";

export type FluidType =
  | "engineoil"
  | "gearboxoil"
  | "forkoil"
  | "breakfluid"
  | "coolant";

export type TirePosition = "front" | "rear" | "sidecar";
export type BatteryType = "lead-acid" | "gel" | "agm" | "lithium-ion" | "other";
export type OilType = "synthetic" | "semi-synthetic" | "mineral";

export const maintenanceRecords = sqliteTable("maintenance_records", {
  id: int().primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // SQLite DATE stored as TEXT
  odo: integer("odo").notNull(),
  motorcycleId: integer("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  cost: real("cost"), // decimal‐friendly REAL column
  currency: text("currency"), // e.g. "CHF", "EUR", "USD"
  description: text("description"), // optional notes
  type: text("type").notNull().$type<MaintenanceType>(), // discriminator

  // Generic brand and model fields for various maintenance items
  brand: text("brand"), // optional, e.g. for tires
  model: text("model"), // optional, e.g. for tires

  // Tire-specific fields
  tirePosition: text("tire_position").$type<TirePosition>(), // optional, e.g. for tires
  tireSize: text("tire_size"), // optional, e.g. "120/70ZR17"
  dotCode: text("dot_code"), // optional, e.g. DOT date code for tires

  // Battery-specific fields
  batteryType: text("battery_type").$type<BatteryType>(), // optional, e.g. "lead-acid"

  // Fluid-specific fields
  fluidType: text("fluid_type").$type<FluidType>(), // optional, e.g. "engineoil"
  viscosity: text("viscosity"), // optional, e.g. "10W40"
  oilType: text("oil_type").$type<OilType>(), // optional, e.g. "synthetic", "semi-synthetic"
});

export const issues = sqliteTable("issues", {
  id: int().primaryKey({ autoIncrement: true }),
  motorcycleId: int("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  odo: integer("odo").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["new", "in_progress", "done"] })
    .notNull()
    .default("new"),
  date: text("date").default(sql`(CURRENT_DATE)`), // SQLite DATE stored as TEXT
});

export const locations = sqliteTable("locations", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const locationRecords = sqliteTable("location_records", {
  id: int().primaryKey({ autoIncrement: true }),
  motorcycleId: int("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  locationId: int("location_id")
    .notNull()
    .references(() => locations.id),
  date: text("date")
    .notNull()
    .default(sql`(CURRENT_DATE)`), // SQLite DATE stored as TEXT
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type CurrentLocation = typeof locationRecords.$inferSelect;
export type NewCurrentLocationRecord = typeof locationRecords.$inferInsert;

export type Motorcycle = typeof motorcycles.$inferSelect;
export type NewMotorcycle = typeof motorcycles.$inferInsert;
export type EditorMotorcycle = Partial<NewMotorcycle>;

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRecord = typeof maintenanceRecords.$inferInsert;
export type EditMaintenanceRecord = Partial<NewMaintenanceRecord>;

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type EditorIssue = Partial<NewIssue>;
