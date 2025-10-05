import { sql } from "drizzle-orm";
import {
  int,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
  | "finaldriveoil"
  | "driveshaftoil"
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

export const currencySettings = sqliteTable("currencies", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  symbol: text().notNull(),
  label: text(),
  conversionFactor: real("conversion_factor").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const locationRecords = sqliteTable("location_records", {
  id: int().primaryKey({ autoIncrement: true }),
  motorcycleId: int("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id),
  locationId: int("location_id")
    .notNull()
    .references(() => locations.id),
  odometer: integer("odometer"),
  date: text("date")
    .notNull()
    .default(sql`(CURRENT_DATE)`), // SQLite DATE stored as TEXT
});

export const torqueSpecs = sqliteTable("torque_specs", {
  id: int().primaryKey({ autoIncrement: true }),
  motorcycleId: int("motorcycle_id")
    .notNull()
    .references(() => motorcycles.id, { onDelete: "cascade" }),
  category: text().notNull(),
  name: text().notNull(),
  torque: real().notNull(),
  variation: real(),
  description: text(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const users = sqliteTable(
  "users",
  {
    id: int().primaryKey({ autoIncrement: true }),
    email: text().notNull(),
    username: text().notNull(),
    name: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text().notNull().default("user"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    usernameIdx: uniqueIndex("users_username_unique").on(table.username),
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    token: text().notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_unique").on(table.token),
  })
);

export const documents = sqliteTable("documents", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  filePath: text("file_path").notNull(),
  previewPath: text("preview_path"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const documentMotorcycles = sqliteTable(
  "document_motorcycles",
  {
    documentId: int("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    motorcycleId: int("motorcycle_id")
      .notNull()
      .references(() => motorcycles.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.documentId, table.motorcycleId] }),
  })
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type CurrentLocation = typeof locationRecords.$inferSelect;
export type NewCurrentLocationRecord = typeof locationRecords.$inferInsert;

export type CurrencySetting = typeof currencySettings.$inferSelect;
export type NewCurrencySetting = typeof currencySettings.$inferInsert;

export type TorqueSpecification = typeof torqueSpecs.$inferSelect;
export type NewTorqueSpecification = typeof torqueSpecs.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentMotorcycle = typeof documentMotorcycles.$inferSelect;
export type NewDocumentMotorcycle = typeof documentMotorcycles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Motorcycle = typeof motorcycles.$inferSelect;
export type NewMotorcycle = typeof motorcycles.$inferInsert;
export type EditorMotorcycle = Partial<NewMotorcycle>;

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRecord = typeof maintenanceRecords.$inferInsert;
export type EditMaintenanceRecord = Partial<NewMaintenanceRecord>;

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type EditorIssue = Partial<NewIssue>;
