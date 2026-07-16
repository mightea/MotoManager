export type UserRole = "admin" | "user";

export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type NewUser = Omit<User, "id" | "createdAt" | "updatedAt" | "lastLoginAt"> & {
  password?: string;
};

export interface Authenticator {
  id: string;
  userId: number;
  publicKey: Buffer;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string | null;
  createdAt: string;
}

export interface Motorcycle {
  id: number;
  make: string;
  model: string;
  fabricationDate: string | null;
  userId: number;
  vin: string | null;
  engineNumber: string | null;
  vehicleNr: string | null;
  numberPlate: string | null;
  image: string | null;
  isVeteran: boolean;
  /**
   * Lifecycle status. Source of truth. `isArchived` below is kept in sync
   * (archived/sold => true) for backward compatibility.
   */
  status: MotorcycleStatus;
  /** @deprecated derived from `status`; use `status`. Kept for legacy clients. */
  isArchived: boolean;
  /** Sidecar rig — gates the sidecar-related UI (e.g. sidecar tire pressure). */
  hasSidecar: boolean;
  /**
   * Further, unidentified previous owners exist beyond the recorded ones — the
   * ownership history is incomplete. When true the clients stop asserting a
   * definitive "N. Hand" position.
   */
  hasUnknownOwners: boolean;
  firstRegistration: string | null;
  initialOdo: number;
  manualOdo: number | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  normalizedPurchasePrice: number | null;
  currencyCode: string | null;
  fuelTankSize: number | null;
  /** Model-series link for derived part compatibility (migration 012). */
  seriesId: number | null;
  /**
   * Per-wheel brake type; null = unconfigured (maintenance UI then shows every
   * brake option). Sidecar only meaningful when hasSidecar. See migration 038.
   */
  frontBrakeType: BrakeType | null;
  rearBrakeType: BrakeType | null;
  sidecarBrakeType: BrakeType | null;
  /**
   * Drivetrain; null = unconfigured (maintenance UI shows every option). Filters
   * chain- vs shaft-drive options. See migration 039.
   */
  driveType: DriveType | null;
  /** Sale details, populated when status === "sold" (see migration 040). */
  soldDate: string | null;
  salePrice: number | null;
  normalizedSalePrice: number | null;
  saleCurrencyCode: string | null;
  buyerName: string | null;
  latestOdo?: number | null;
  openIssues?: number;
  maintenanceCount?: number;
}

/** Lifecycle: active fleet, archived (kept, hidden), or sold (no longer owned). */
export type MotorcycleStatus = "active" | "archived" | "sold";

/** Disc (Scheibenbremse) vs drum (Trommelbremse) brake at a wheel. */
export type BrakeType = "disc" | "drum";

/** Chain (Kettenantrieb) vs shaft (Kardanantrieb) final drive. */
export type DriveType = "chain" | "shaft";

export type NewMotorcycle = Omit<Motorcycle, "id" | "latestOdo" | "openIssues" | "maintenanceCount">;
export type EditorMotorcycle = Partial<NewMotorcycle>;

export type MaintenanceType =
  | "tire"
  | "battery"
  | "brakepad"
  | "chain"
  | "brakerotor"
  | "fluid"
  | "general"
  | "repair"
  | "service"
  | "inspection"
  | "location"
  | "fuel";

export type FluidType =
  | "engineoil"
  | "gearboxoil"
  | "finaldriveoil"
  | "finaldrivegearboxoil"
  | "forkoil"
  | "brakefluid"
  | "coolant";

export type TirePosition = "front" | "rear" | "sidecar";
export type BatteryType = "lead-acid" | "gel" | "agm" | "lithium-ion" | "other";
export type OilType = "synthetic" | "semi-synthetic" | "mineral";

export interface MaintenanceRecord {
  id: number;
  date: string;
  odo: number;
  motorcycleId: number;
  cost: number | null;
  normalizedCost: number | null;
  currency: string | null;
  description: string | null;
  type: MaintenanceType;
  brand: string | null;
  model: string | null;
  tirePosition: TirePosition | null;
  tireSize: string | null;
  dotCode: string | null;
  batteryType: BatteryType | null;
  fluidType: FluidType | null;
  viscosity: string | null;
  oilType: OilType | null;
  locationId: number | null;
  fuelType: string | null;
  fuelAmount: number | null;
  pricePerUnit: number | null;
  fuelConsumption: number | null;
  tripDistance: number | null;
  parentId: number | null;
}

export type NewMaintenanceRecord = Omit<MaintenanceRecord, "id"> & {
  bundledItems?: string[];
};
export type EditMaintenanceRecord = Partial<NewMaintenanceRecord>;

export interface Issue {
  id: number;
  motorcycleId: number;
  odo: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "new" | "in_progress" | "done";
  date: string | null;
}

export type NewIssue = Omit<Issue, "id">;
export type EditorIssue = Partial<NewIssue>;

export type LocationType =
  | "storage"
  | "maintenanceShop"
  | "fuelStation"
  | "inspection"
  | "other";

export interface Location {
  id: number;
  name: string;
  type: LocationType;
  latitude: number | null;
  longitude: number | null;
  userId: number;
  createdAt: string;
  updatedAt: string | null;
}

export type NewLocation = Omit<
  Location,
  "id" | "createdAt" | "updatedAt" | "latitude" | "longitude"
> & {
  latitude?: number | null;
  longitude?: number | null;
};

export interface CurrencySetting {
  id: number;
  code: string;
  symbol: string;
  label: string | null;
  conversionFactor: number;
  createdAt: string;
}

export type NewCurrencySetting = Omit<CurrencySetting, "id" | "createdAt" | "label"> & {
  label?: string | null;
};

export interface CurrentLocation {
  id: number;
  motorcycleId: number;
  locationId: number;
  odometer: number | null;
  date: string;
}

export type NewCurrentLocationRecord = Omit<CurrentLocation, "id">;

export type PressureUnit = "bar" | "psi";

/**
 * Recommended tire pressures for a motorcycle. One row per motorcycle
 * (1:1) — we deliberately do not model loadouts (Solo / Beifahrer /
 * Beladen) as separate rows; if the user wants to record those they
 * keep them in the description fields of maintenance records.
 *
 * Canonical storage is in bar; psi entries get converted on save.
 * `preferredUnit` is remembered so the form re-opens in the unit the
 * user originally typed, with the converted value rendered as a small
 * secondary line.
 */
export interface TirePressure {
  id: number;
  motorcycleId: number;
  /**
   * One optional front/rear pair per riding configuration; at least one
   * pair is present on a stored record.
   */
  frontBar: number | null;
  rearBar: number | null;
  /** Riding with a passenger; null when not recorded. */
  frontPassengerBar: number | null;
  rearPassengerBar: number | null;
  /** Offroad riding; null when not recorded. */
  frontOffroadBar: number | null;
  rearOffroadBar: number | null;
  /**
   * Sidecar wheel — a third tire position with one optional value per
   * configuration; `sidecarBar` is the solo value. All null on motorcycles
   * without a sidecar.
   */
  sidecarBar: number | null;
  sidecarPassengerBar: number | null;
  sidecarOffroadBar: number | null;
  preferredUnit: PressureUnit;
  createdAt: string;
  updatedAt: string;
}

export type NewTirePressure = Omit<TirePressure, "id" | "createdAt" | "updatedAt">;

export interface TorqueSpecification {
  id: number;
  motorcycleId: number;
  category: string;
  name: string;
  torque: number;
  torqueEnd: number | null;
  variation: number | null;
  toolSize: string | null;
  description: string | null;
  unverified: boolean;
  createdAt: string;
}

export type NewTorqueSpecification = Omit<TorqueSpecification, "id" | "createdAt" | "torqueEnd" | "variation" | "toolSize" | "description" | "unverified"> & {
  torqueEnd?: number | null;
  variation?: number | null;
  toolSize?: string | null;
  description?: string | null;
  unverified?: boolean;
};

export interface UserSettings {
  id: number;
  userId: number;
  tireInterval: number;
  batteryLithiumInterval: number;
  batteryDefaultInterval: number;
  engineOilInterval: number;
  gearboxOilInterval: number;
  finalDriveOilInterval: number;
  finalDriveGearboxOilInterval: number;
  forkOilInterval: number;
  brakeFluidInterval: number;
  coolantInterval: number;
  chainInterval: number;
  tireKmInterval: number | null;
  engineOilKmInterval: number | null;
  gearboxOilKmInterval: number | null;
  finalDriveOilKmInterval: number | null;
  finalDriveGearboxOilKmInterval: number | null;
  forkOilKmInterval: number | null;
  brakeFluidKmInterval: number | null;
  coolantKmInterval: number | null;
  chainKmInterval: number | null;
  minKmPerYear: number;
  updatedAt: string;
}

export type NewUserSettings = Omit<UserSettings, "id" | "updatedAt">;

export interface Session {
  id: number;
  token: string;
  userId: number;
  expiresAt: string;
  createdAt: string;
}

export type NewSession = Omit<Session, "id" | "createdAt">;

export interface Document {
  id: number;
  title: string;
  filePath: string;
  previewPath: string | null;
  uploadedBy: string | null;
  ownerId: number | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewDocument = Omit<Document, "id" | "createdAt" | "updatedAt">;

export interface DocumentMotorcycle {
  documentId: number;
  motorcycleId: number;
}

export type NewDocumentMotorcycle = DocumentMotorcycle;

export interface PreviousOwner {
  id: number;
  motorcycleId: number;
  name: string;
  surname: string;
  purchaseDate: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  phoneNumber: string | null;
  email: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewPreviousOwner = Omit<PreviousOwner, "id" | "createdAt" | "updatedAt">;

export interface Challenge {
  id: string;
  userId: number | null;
  challenge: string;
  expiresAt: string;
  createdAt: string;
}

export type NewChallenge = Omit<Challenge, "createdAt">;

export interface Expense {
  id: number;
  userId: number;
  date: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  intervalMonths: number | null;
  createdAt: string;
  updatedAt: string;
  motorcycleIds?: number[];
}

export type NewExpense = Omit<Expense, "id" | "userId" | "createdAt" | "updatedAt">;
