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
  vehicleIdNr: string | null;
  numberPlate: string | null;
  image: string | null;
  isVeteran: boolean;
  isArchived: boolean;
  firstRegistration: string | null;
  initialOdo: number;
  manualOdo: number | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  normalizedPurchasePrice: number | null;
  currencyCode: string | null;
  fuelTankSize: number | null;
  latestOdo?: number | null;
  openIssues?: number;
  maintenanceCount?: number;
}

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
  inspectionLocation: string | null;
  locationId: number | null;
  fuelType: string | null;
  fuelAmount: number | null;
  pricePerUnit: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  fuelConsumption: number | null;
  tripDistance: number | null;
  isPending?: number;
}

export type NewMaintenanceRecord = Omit<MaintenanceRecord, "id">;
export type EditMaintenanceRecord = Partial<NewMaintenanceRecord>;

export interface Issue {
  id: number;
  motorcycleId: number;
  odo: number;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "new" | "in_progress" | "done";
  date: string | null;
  isPending?: number;
}

export type NewIssue = Omit<Issue, "id">;
export type EditorIssue = Partial<NewIssue>;

export interface Location {
  id: number;
  name: string;
  countryCode: string;
  userId: number;
}

export type NewLocation = Omit<Location, "id" | "countryCode"> & {
  countryCode?: string;
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
  createdAt: string;
}

export type NewTorqueSpecification = Omit<TorqueSpecification, "id" | "createdAt" | "torqueEnd" | "variation" | "toolSize" | "description"> & {
  torqueEnd?: number | null;
  variation?: number | null;
  toolSize?: string | null;
  description?: string | null;
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
  forkOilInterval: number;
  brakeFluidInterval: number;
  coolantInterval: number;
  chainInterval: number;
  tireKmInterval: number | null;
  engineOilKmInterval: number | null;
  gearboxOilKmInterval: number | null;
  finalDriveOilKmInterval: number | null;
  forkOilKmInterval: number | null;
  brakeFluidKmInterval: number | null;
  coolantKmInterval: number | null;
  chainKmInterval: number | null;
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
