// Types for the parts inventory (backend migration 012). Field names mirror
// the API's camelCase JSON exactly.

/** Model-catalog node, hierarchical (realoem-style): Familie -> Serie ->
 *  Modell, max depth 3. Global seed rows have `userId: null`; user-created
 *  custom entries carry the creator's id. Parts and motorcycles may link to
 *  any level — matching walks the tree. */
export interface ModelSeries {
  id: number;
  name: string;
  manufacturer: string;
  parentId: number | null;
  /** Comma-separated BMW type codes (Baumuster, VIN chars 4-7), e.g.
   *  "0502,0503,0513" — used for VIN decoding. */
  typeCodes: string | null;
  /** Comma-separated "start-end" frame-number ranges for pre-1981 bikes,
   *  e.g. "550001-563515,630001-649037". */
  frameRanges: string | null;
  userId: number | null;
  createdAt: string;
}

/** Result of `GET /api/vin/decode` — accepts 17-char VINs and 6-7 digit
 *  pre-1981 frame numbers. */
export interface VinDecodeResult {
  vin: string;
  kind: "vin" | "frameNumber";
  isBmw: boolean;
  typeCode: string | null;
  modelYear: number | null;
  checkDigitValid: boolean | null;
  match: ModelSeries | null;
}

/** "R 1150 GS" for BMW (the common case), "Yamaha XSR 700" otherwise. */
export function modelSeriesDisplayName(series: ModelSeries): string {
  return series.manufacturer === "BMW" ? series.name : `${series.manufacturer} ${series.name}`;
}

export interface StorageLocation {
  id: number;
  userId: number;
  name: string;
  parentId: number | null;
  /** Physical place (garage/workshop from the locations entity); root-level
   *  entries only — children inherit it from the tree root. */
  locationId: number | null;
  createdAt: string;
  clientId: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

/** A catalog part as returned by `GET /api/parts` (PartWithMeta on the server):
 *  the row itself plus embedded fitment and the derived inventory numbers. */
export interface Part {
  id: number;
  userId: number;
  partNumber: string;
  name: string;
  manufacturer: string;
  description: string | null;
  isPublic: boolean;
  /** Image URL path (e.g. "/images/<uuid>.jpg"), server-managed via the
   *  upload endpoint; append `?width=` for resized thumbnails. */
  image: string | null;
  createdAt: string;
  seriesIds: number[];
  /** Derived on the server: live stock minus live consumption. */
  onHand: number;
  stockCount: number;
  clientId: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface NewPart {
  partNumber: string;
  name: string;
  manufacturer?: string;
  description?: string | null;
  isPublic?: boolean;
  seriesIds?: number[];
}

export type EditorPart = Partial<NewPart>;

export interface PartStock {
  id: number;
  partId: number;
  quantity: number;
  price: number | null;
  currency: string | null;
  normalizedPrice: number | null;
  purchaseDate: string | null;
  storageLocationId: number | null;
  notes: string | null;
  /** Used/salvaged piece (e.g. pulled from a donor motorcycle). */
  isUsed: boolean;
  createdAt: string;
  clientId: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface NewPartStock {
  partId: number;
  quantity: number;
  price?: number | null;
  currency?: string | null;
  purchaseDate?: string | null;
  storageLocationId?: number | null;
  notes?: string | null;
  isUsed?: boolean;
}

export interface PartConsumption {
  id: number;
  partId: number;
  maintenanceRecordId: number | null;
  quantity: number;
  date: string;
  notes: string | null;
  createdAt: string;
  clientId: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface NewPartConsumption {
  partId: number;
  quantity: number;
  maintenanceRecordId?: number | null;
  date?: string | null;
  notes?: string | null;
}

/** Another user's part from `GET /api/parts/public`. Catalog data is always
 *  visible; availability and stock detail (prices, purchase dates, storage
 *  locations) are only present when the owner marked the part public. */
export interface PublicPart {
  id: number;
  partNumber: string;
  name: string;
  manufacturer: string;
  description: string | null;
  image: string | null;
  seriesIds: number[];
  ownerName: string;
  isPublic: boolean;
  hasStock: boolean | null;
  totalQuantity: number | null;
  stocks: PublicStockEntry[] | null;
}

export interface PublicStockEntry {
  quantity: number;
  price: number | null;
  currency: string | null;
  purchaseDate: string | null;
  storageLocation: string | null;
  isUsed: boolean;
}

// MARK: Invoice import (`POST /api/part-imports/parse`)

/** One parsed invoice line, annotated with the user's inventory match. */
export interface ParsedInvoiceItem {
  quantity: number;
  /** As printed on the invoice, e.g. "61 31 2 300 383". */
  partNumber: string;
  name: string;
  unitPrice: number | null;
  lineTotal: number | null;
  matchedPartId: number | null;
  matchedPartName: string | null;
  warnings: string[];
}

export interface ParsedInvoice {
  invoice: {
    supplier: string | null;
    invoiceNumber: string | null;
    /** ISO date (YYYY-MM-DD). */
    invoiceDate: string | null;
    currency: string;
  };
  items: ParsedInvoiceItem[];
  /** "llm" when the local model structured the text, "fallback" for the
   *  deterministic layout parser. */
  source: "llm" | "fallback";
  /** Stock entries referencing this invoice number already exist. */
  alreadyImported: boolean;
}
