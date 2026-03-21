import Dexie, { type Table } from 'dexie';
import type { 
  Motorcycle, 
  Issue, 
  MaintenanceRecord, 
  CurrentLocation, 
  Location, 
  UserSettings,
  Document,
  DocumentMotorcycle,
  CurrencySetting
} from '~/types/db';

export class MotoDatabase extends Dexie {
  motorcycles!: Table<Motorcycle>;
  issues!: Table<Issue>;
  maintenance!: Table<MaintenanceRecord>;
  locationHistory!: Table<CurrentLocation>;
  locations!: Table<Location>;
  settings!: Table<UserSettings>;
  documents!: Table<Document>;
  docAssignments!: Table<DocumentMotorcycle>;
  currencies!: Table<CurrencySetting>;
  users!: Table<import('~/types/db').User>;

  constructor() {
    super('MotoDatabase');
    this.version(1).stores({
      motorcycles: 'id, make, model, userId',
      issues: 'id, motorcycleId, status, isPending',
      maintenance: 'id, motorcycleId, type, date, isPending',
      locationHistory: 'id, motorcycleId, locationId',
      locations: 'id, userId',
      settings: 'id, userId',
      documents: 'id, ownerId, isPrivate',
      docAssignments: '[documentId+motorcycleId], documentId, motorcycleId',
      currencies: 'id, code',
      users: 'id, username, email'
    });
  }
}

export const db = new MotoDatabase();

/**
 * Helper to save data to the local cache.
 */
export async function saveToCache<T extends { id: number | string }>(table: Table<T>, data: T | T[]) {
  if (Array.isArray(data)) {
    await table.bulkPut(data);
  } else {
    await table.put(data);
  }
}

/**
 * Helper to get data from the local cache.
 */
export async function getFromCache<T>(table: Table<T>): Promise<T[]> {
  return await table.toArray();
}
