// Types for the parts inventory (backend migration 012). Field names mirror
// the API's camelCase JSON exactly.

/** Model-series lookup entry. Global seed rows have `userId: null`;
 *  user-created custom series carry the creator's id. */
export interface ModelSeries {
  id: number;
  name: string;
  manufacturer: string;
  userId: number | null;
  createdAt: string;
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

/** Another user's shared part from `GET /api/parts/public`. The server
 *  whitelists catalog data + availability; prices/locations never appear. */
export interface PublicPart {
  id: number;
  partNumber: string;
  name: string;
  manufacturer: string;
  description: string | null;
  image: string | null;
  seriesIds: number[];
  ownerName: string;
  hasStock: boolean;
  totalQuantity: number;
}
