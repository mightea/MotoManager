import { db } from "./db.client";
import { fetchFromBackend } from "./backend";
import { getSessionToken } from "~/services/auth";

let isSyncing = false;

/**
 * Background sync process to push pending items to the server.
 */
export async function syncPendingItems() {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) return;
  
  const token = getSessionToken();
  if (!token) return;

  isSyncing = true;
  console.log("[Sync] Starting sync of pending items...");

  try {
    // 1. Sync Issues
    const pendingIssues = await db.issues.where("isPending").equals(1).toArray();
    for (const issue of pendingIssues) {
      try {
        const { id: _id, isPending: _isPending, ...data } = issue;
        console.log(`[Sync] Syncing issue:`, data);
        const result = await fetchFromBackend<{ issue: any }>(
          `/motorcycles/${issue.motorcycleId}/issues`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
          token
        );
        
        // Remove temporary local item and add server item
        await db.issues.delete(issue.id);
        await db.issues.put(result.issue);
        console.log(`[Sync] Issue synced successfully`);
      } catch (e) {
        console.error(`[Sync] Failed to sync issue:`, e);
      }
    }

    // 2. Sync Maintenance
    const pendingMaintenance = await db.maintenance.where("isPending").equals(1).toArray();
    for (const record of pendingMaintenance) {
      try {
        const { id: _id, isPending: _isPending, ...data } = record;
        console.log(`[Sync] Syncing maintenance:`, data);
        const result = await fetchFromBackend<{ maintenanceRecord: any }>(
          `/motorcycles/${record.motorcycleId}/maintenance`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
          token
        );
        
        // Remove temporary local item and add server item
        await db.maintenance.delete(record.id);
        await db.maintenance.put(result.maintenanceRecord);
        console.log(`[Sync] Maintenance record synced successfully`);
      } catch (e) {
        console.error(`[Sync] Failed to sync maintenance:`, e);
      }
    }
  } finally {
    isSyncing = false;
    console.log("[Sync] Sync process finished");
  }
}

/**
 * Hook up sync to online events.
 */
export function initSync() {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    console.log("[Sync] Browser online, triggering sync...");
    syncPendingItems();
  });

  // Also try periodically
  setInterval(syncPendingItems, 60000); // Every minute
  
  // Initial try
  syncPendingItems();
}
