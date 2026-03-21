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
  torqueSpecs!: Table<import('~/types/db').TorqueSpecification>;

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
      users: 'id, username, email',
      torqueSpecs: 'id, motorcycleId, category, isPending'
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
 * Helper to fully synchronize a table with new data, removing old items.
 * If a filter is provided, only items matching the filter are synchronized.
 */
export async function syncCache<T>(table: Table<T>, data: T[], filter?: (item: T) => boolean) {
  // Never remove items that are pending sync
  const baseFilter = (item: any) => item.isPending !== 1;
  
  if (filter) {
    const allItems = await table.toArray();
    const itemsToRemove = allItems.filter(item => baseFilter(item) && filter(item));
    await table.bulkDelete(itemsToRemove.map(i => (i as any).id).filter(id => id !== undefined));
  } else {
    // If no specific filter, remove all non-pending items
    const allItems = await table.toArray();
    const itemsToRemove = allItems.filter(baseFilter);
    await table.bulkDelete(itemsToRemove.map(i => (i as any).id).filter(id => id !== undefined));
  }
  await table.bulkPut(data);
}

/**
 * Helper to get data from the local cache.
 */
export async function getFromCache<T>(table: Table<T>): Promise<T[]> {
  return await table.toArray();
}
