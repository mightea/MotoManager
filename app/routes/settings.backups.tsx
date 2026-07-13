import { Form, Link, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { requireAdmin, requireUser, getSessionToken } from "~/services/auth";
import { getVersion } from "~/config";
import {
  deleteBackup,
  downloadBackup,
  listBackups,
  triggerBackup,
  type BackupRecord,
} from "~/services/backups";
import { ApiError } from "~/utils/backend";
import { ArrowLeft, DatabaseBackup, Download, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "~/components/button";
import { useConfirm } from "~/components/confirm-provider";
import { useState } from "react";
import type { Route } from "./+types/settings.backups";

export function meta() {
  return [
    { title: "Backups - Moto Manager" },
    { name: "description", content: "Datenbank-Backups überwachen und manuell auslösen." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  requireAdmin(user);
  return { overview: await listBackups(token) };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user, token } = await requireUser(request);
  requireAdmin(user);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "createBackup") {
    try {
      await triggerBackup(token, getVersion());
      return { success: "Backup erfolgreich erstellt." };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        return { error: "Es läuft bereits ein Backup." };
      }
      return { error: e instanceof Error ? e.message : "Backup fehlgeschlagen." };
    }
  }

  if (intent === "deleteBackup") {
    const id = Number(formData.get("id"));
    if (!id) return { error: "Ungültige ID." };
    try {
      await deleteBackup(token, id);
      return { success: "Backup gelöscht." };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
    }
  }

  return null;
}

const dateFormatter = new Intl.DateTimeFormat("de-CH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "–";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "–" : dateFormatter.format(d);
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "–";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "–";
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (isNaN(secs) || secs < 0) return "–";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function BackupsSettings() {
  const { overview } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const confirmDialog = useConfirm();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";
  const { config, running, lastSuccessAt, nextScheduledAt, backups } = overview;

  async function handleDownload(record: BackupRecord) {
    if (!record.filePath) return;
    setDownloadError(null);
    setDownloadingId(record.id);
    try {
      const token = getSessionToken();
      if (!token) throw new Error("Nicht angemeldet.");
      await downloadBackup(token, record.id, record.filePath);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download fehlgeschlagen.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pt-4 sm:pt-28 pb-20">
      <div className="flex items-center gap-4">
        <Link
          to="/settings/admin"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-secondary transition-colors hover:border-primary hover:text-primary dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="space-y-1">
          <h1 className="font-display text-4xl uppercase tracking-wide leading-none text-base-content dark:text-white">
            Backups
          </h1>
          <p className="text-secondary dark:text-navy-300">
            Datenbank- und Datei-Backups überwachen und manuell auslösen.
          </p>
        </div>
      </div>

      {actionData && "error" in actionData && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {actionData.error}
        </div>
      )}
      {actionData && "success" in actionData && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
          {(actionData as { success: string }).success}
        </div>
      )}
      {downloadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {downloadError}
        </div>
      )}

      {/* Status summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Letztes erfolgreiches Backup" value={formatDate(lastSuccessAt)} />
        <SummaryCard
          label="Nächstes geplantes Backup"
          value={config.enabled ? formatDate(nextScheduledAt) : "Deaktiviert"}
        />
        <SummaryCard
          label="Intervall"
          value={config.enabled ? `Alle ${config.intervalHours} h` : "–"}
        />
        <SummaryCard label="Aufbewahrung" value={`${config.keep} Archive`} />
      </section>

      {!config.enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          Automatische Backups sind deaktiviert (BACKUP_ENABLED=false). Manuelle Backups sind weiterhin möglich.
        </div>
      )}

      {/* Manual trigger */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <DatabaseBackup className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
            Manuelles Backup
          </h2>
        </div>
        <p className="mb-4 text-sm text-secondary dark:text-navy-300">
          Erstellt sofort eine konsistente Momentaufnahme der Datenbank samt hochgeladener Bilder und Dokumente.
          Der Server bleibt währenddessen erreichbar.
        </p>
        <Form method="post">
          <input type="hidden" name="intent" value="createBackup" />
          <Button type="submit" disabled={isSubmitting || running}>
            {isSubmitting ? "Backup läuft…" : running ? "Backup läuft bereits…" : "Jetzt Backup erstellen"}
          </Button>
        </Form>
      </section>

      {/* History */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <h2 className="mb-6 font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
          Verlauf
        </h2>
        {backups.length === 0 ? (
          <p className="text-sm text-secondary dark:text-navy-300">Noch keine Backups vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-secondary dark:bg-navy-900 dark:text-navy-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Zeitpunkt</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Auslöser</th>
                  <th className="px-4 py-3 font-semibold">Versionen</th>
                  <th className="px-4 py-3 font-semibold">Größe</th>
                  <th className="px-4 py-3 font-semibold">Dauer</th>
                  <th className="px-4 py-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                {backups.map((b) => (
                  <tr key={b.id} className="group hover:bg-gray-50 dark:hover:bg-navy-700/50">
                    <td suppressHydrationWarning className="px-4 py-3 text-foreground dark:text-white">
                      {formatDate(b.startedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} error={b.error} />
                    </td>
                    <td className="px-4 py-3 text-secondary dark:text-navy-300">
                      {b.trigger === "manual" ? "Manuell" : "Geplant"}
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary dark:text-navy-300">
                      <div className="whitespace-nowrap">
                        <span className="text-secondary/70 dark:text-navy-400">BE</span>{" "}
                        {b.backendVersion ?? "–"}
                      </div>
                      <div className="whitespace-nowrap">
                        <span className="text-secondary/70 dark:text-navy-400">FE</span>{" "}
                        {b.frontendVersion ?? "–"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary dark:text-navy-300">{formatBytes(b.sizeBytes)}</td>
                    <td className="px-4 py-3 text-secondary dark:text-navy-300">
                      {formatDuration(b.startedAt, b.finishedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === "success" && b.filePath && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Backup herunterladen"
                            disabled={downloadingId === b.id}
                            onClick={() => handleDownload(b)}
                            className="h-8 w-8"
                          >
                            {downloadingId === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {b.status !== "running" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Backup löschen"
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: "Backup löschen?",
                                description: "Das Archiv wird endgültig entfernt.",
                              });
                              if (!ok) return;
                              submit(
                                { intent: "deleteBackup", id: String(b.id) },
                                { method: "post" },
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-base-300/70 bg-base-100 p-5 dark:border-navy-700 dark:bg-navy-800">
      <p className="text-xs uppercase tracking-wide text-secondary dark:text-navy-400">{label}</p>
      <p suppressHydrationWarning className="mt-2 text-lg font-semibold text-foreground dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status, error }: { status: BackupRecord["status"]; error: string | null }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> Erfolgreich
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Läuft
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
      title={error ?? undefined}
    >
      <XCircle className="h-3.5 w-3.5" /> Fehlgeschlagen
    </span>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
