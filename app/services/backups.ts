import { getBackendUrl } from "~/config";
import { fetchFromBackend } from "~/utils/backend";

export type BackupStatus = "running" | "success" | "failed";

export interface BackupRecord {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: BackupStatus;
  trigger: "scheduled" | "manual";
  sizeBytes: number | null;
  filePath: string | null;
  error: string | null;
  backendVersion: string | null;
  frontendVersion: string | null;
}

export interface BackupOverview {
  config: {
    enabled: boolean;
    intervalHours: number;
    keep: number;
  };
  running: boolean;
  lastSuccessAt: string | null;
  nextScheduledAt: string | null;
  backups: BackupRecord[];
}

/** Schedule config, current status and run history for the admin monitor. */
export async function listBackups(token: string): Promise<BackupOverview> {
  return fetchFromBackend<BackupOverview>("/admin/backups", {}, token);
}

/**
 * Trigger a backup now. Passes the frontend version so the archive/manifest
 * records the frontend that was live. Rejects with a 409 ApiError if one is
 * already running.
 */
export async function triggerBackup(
  token: string,
  frontendVersion: string,
): Promise<BackupRecord> {
  const response = await fetchFromBackend<{ backup: BackupRecord }>(
    "/admin/backups",
    { method: "POST", body: JSON.stringify({ frontendVersion }) },
    token,
  );
  return response.backup;
}

export async function deleteBackup(token: string, id: number): Promise<void> {
  await fetchFromBackend(`/admin/backups/${id}`, { method: "DELETE" }, token);
}

/**
 * Download an archive. The endpoint is Bearer-only (no `?token=`), so a plain
 * `<a href>` can't authenticate — fetch it with the token, then save the blob.
 */
export async function downloadBackup(
  token: string,
  id: number,
  fileName: string,
): Promise<void> {
  const response = await fetch(`${getBackendUrl()}/api/admin/backups/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Download fehlgeschlagen (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
