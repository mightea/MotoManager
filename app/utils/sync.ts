import { db } from "./db.client";
import { fetchFromBackend } from "./backend";
import { getSessionToken } from "~/services/auth";
import { type Pending, type Issue, type MaintenanceRecord, type TorqueSpecification } from "~/types/db";

import { syncStore } from "~/services/sync-store.client";

let isSyncing = false;

export type SyncStatus = "idle" | "syncing" | "success" | "error";

function notifySyncStatus(status: SyncStatus, count: number = 0) {
  syncStore.update(status, count);
}

/**
 * Background sync process to push pending items to the server.
 */
export async function syncPendingItems() {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) return;
  
  const token = getSessionToken();
  if (!token) return;

  const pendingIssues = await db.issues.where("isPending").equals(1).toArray() as Pending<Issue>[];
  const pendingMaintenance = await db.maintenance.where("isPending").equals(1).toArray() as Pending<MaintenanceRecord>[];
  const pendingTorqueSpecs = await db.torqueSpecs.where("isPending").equals(1).toArray() as Pending<TorqueSpecification>[];
  const total = pendingIssues.length + pendingMaintenance.length + pendingTorqueSpecs.length;

  if (total === 0) return;

  isSyncing = true;
  notifySyncStatus("syncing");
  console.log(`[Sync] Starting sync of ${total} pending items...`);

  let successCount = 0;

  try {
    // 1. Sync Issues
    for (const issue of pendingIssues) {
      try {
        const { id: _id, isPending: _isPending, ...data } = issue;
        const result = await fetchFromBackend<{ issue: any }>(
          `/motorcycles/${issue.motorcycleId}/issues`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
          token
        );
        await db.issues.delete(issue.id);
        await db.issues.put(result.issue);
        successCount++;
      } catch (e) {
        console.error(`[Sync] Failed to sync issue:`, e);
      }
    }

    // 2. Sync Maintenance
    for (const record of pendingMaintenance) {
      try {
        const { id: _id, isPending: _isPending, ...data } = record;
        const result = await fetchFromBackend<{ maintenanceRecord: any }>(
          `/motorcycles/${record.motorcycleId}/maintenance`,
          {
            method: "POST",
            body: JSON.stringify(data),
          },
          token
        );
        await db.maintenance.delete(record.id);
        await db.maintenance.put(result.maintenanceRecord);
        successCount++;
      } catch (e) {
        console.error(`[Sync] Failed to sync maintenance:`, e);
      }
    }

    // 3. Sync Torque Specs
    for (const spec of pendingTorqueSpecs) {
      try {
        const { id, isPending: _isPending, ...data } = spec;
        const isNew = id < 0;
        
        console.log(`[Sync] Syncing torque spec (${isNew ? "POST" : "PUT"}):`, data);
        
        const result = await fetchFromBackend<{ torqueSpec: any }>(
          isNew 
            ? `/motorcycles/${spec.motorcycleId}/torque-specs`
            : `/motorcycles/${spec.motorcycleId}/torque-specs/${id}`,
          {
            method: isNew ? "POST" : "PUT",
            body: JSON.stringify(data),
          },
          token
        );
        
        if (isNew) {
          await db.torqueSpecs.delete(id);
        }
        await db.torqueSpecs.put(result.torqueSpec);
        successCount++;
      } catch (e) {
        console.error(`[Sync] Failed to sync torque spec:`, e);
      }
    }

    if (successCount > 0) {
      notifySyncStatus("success", successCount);
      // Reset to idle after a delay
      setTimeout(() => notifySyncStatus("idle"), 5000);
    } else {
      notifySyncStatus("idle");
    }
  } catch (e) {
    notifySyncStatus("error");
    setTimeout(() => notifySyncStatus("idle"), 5000);
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
