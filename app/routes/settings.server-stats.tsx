import { useLoaderData } from "react-router";
import { requireUser } from "~/services/auth";
import { formatNumber } from "~/utils/numberUtils";
import type { Route } from "./+types/settings.server-stats";
import clsx from "clsx";
import { fetchFromBackend } from "~/utils/backend";
import { getVersion } from "~/config";
import { listBackups, type BackupOverview } from "~/services/backups";
import { PageHeader } from "~/components/page-header";
import { Card, CardHeading } from "~/components/card";

/** Instance-wide counters in the `/stats` payload's `global` block. */
interface GlobalStats {
  users: number;
  motorcycles: number;
  archivedMotorcycles: number;
  documents: number;
  documentAssignments: number;
  maintenance: number;
  issues: number;
  openIssues: number;
  locations: number;
  locationHistory: number;
  torqueSpecs: number;
}

interface ServerStatsResponse {
  stats: { global: GlobalStats };
  avgMotoPerUser?: number;
  avgDocsPerUser?: number;
}

export function meta() {
  return [
    { title: "Server Statistiken - Moto Manager" },
    { name: "description", content: "Globale Kennzahlen und Systemstatus der Instanz." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);

  // Health and backups are context for the counters — a failure there must
  // not take the page down, so both degrade to null.
  const [response, health, backups] = await Promise.all([
    fetchFromBackend<ServerStatsResponse>("/stats", {}, token),
    fetchFromBackend<{ status: string; version: string }>("/health").catch(() => null),
    listBackups(token).catch((): BackupOverview | null => null),
  ]);

  const { stats, avgMotoPerUser, avgDocsPerUser } = response;

  return { stats: stats.global, avgMotoPerUser, avgDocsPerUser, health, backups };
}

const DATE_TIME = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatMegabytes(bytes: number): string {
  return `${formatNumber(bytes / 1_000_000, 1)} MB`;
}

export default function ServerStats() {
  const { stats, avgMotoPerUser, avgDocsPerUser, health, backups } = useLoaderData<typeof clientLoader>();

  const successful = (backups?.backups ?? []).filter((b) => b.status === "success" && b.sizeBytes);
  const latest = successful[0] ?? null;
  // Oldest → newest for the size chart.
  const sizeSeries = successful.slice(0, 14).reverse();
  const maxSize = Math.max(...sizeSeries.map((b) => b.sizeBytes ?? 0), 1);
  const minSize = Math.min(...sizeSeries.map((b) => b.sizeBytes ?? 0));
  const closedIssues = stats.issues - stats.openIssues;
  const openShare = stats.issues > 0 ? Math.round((stats.openIssues / stats.issues) * 100) : 0;
  const healthy = health?.status === "ok";

  const groups: { title: string; rows: { label: string; value: string; note: string }[] }[] = [
    {
      title: "Motorräder",
      rows: [
        { label: "Motorräder", value: formatNumber(stats.motorcycles), note: `Ø ${formatNumber(avgMotoPerUser, 1)} pro Benutzer` },
        { label: "Davon verkauft", value: formatNumber(stats.archivedMotorcycles), note: "Status «verkauft»" },
        { label: "Standortwechsel", value: formatNumber(stats.locationHistory), note: "erfasste Umzüge zwischen Orten" },
      ],
    },
    {
      title: "Betrieb",
      rows: [
        { label: "Historie-Einträge", value: formatNumber(stats.maintenance), note: "Tanken, Wartung, Reparatur, Standort …" },
        { label: "Mängel offen", value: formatNumber(stats.openIssues), note: `von ${formatNumber(stats.issues)} erfassten` },
        { label: "Anzugsmomente", value: formatNumber(stats.torqueSpecs), note: "hinterlegte Drehmomentwerte" },
      ],
    },
    {
      title: "Dokumente",
      rows: [
        { label: "PDF-Dokumente", value: formatNumber(stats.documents), note: `Ø ${formatNumber(avgDocsPerUser, 1)} pro Benutzer` },
        { label: "Zuordnungen", value: formatNumber(stats.documentAssignments), note: "Dokument ↔ Motorrad" },
      ],
    },
    {
      title: "Orte",
      rows: [
        {
          label: "Orte",
          value: formatNumber(stats.locations),
          note: "Garagen, Werkstätten, Tankstellen, Prüfstellen",
        },
      ],
    },
  ];

  const system: { label: string; value: string; note: string; tone: "ok" | "warn" | "info" }[] = [
    {
      label: "API",
      value: health?.version ?? "–",
      note: healthy ? "Status ok" : "nicht erreichbar",
      tone: healthy ? "ok" : "warn",
    },
    { label: "Web-App", value: getVersion() ?? "–", note: "diese Oberfläche", tone: "ok" },
    {
      label: "Letztes Backup",
      value: backups?.lastSuccessAt ? DATE_TIME.format(new Date(backups.lastSuccessAt)) : "–",
      note: latest?.sizeBytes ? formatMegabytes(latest.sizeBytes) : backups ? "noch keins" : "keine Berechtigung",
      tone: backups?.lastSuccessAt ? "ok" : "warn",
    },
    { label: "Benutzer", value: formatNumber(stats.users), note: "auf dieser Instanz", tone: "info" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 pt-4 pb-20 sm:pt-10">
      <PageHeader
        eyebrow="Admin · Server"
        title="Server-Statistiken"
        description="Systemzustand und Kennzahlen der ganzen Instanz"
      />

      <section aria-label="System" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {system.map((item) => (
          <div
            key={item.label}
            className="flex gap-3 rounded-sm border border-base-300/70 bg-base-100 px-4 py-3 dark:border-navy-700 dark:bg-navy-800"
          >
            <span
              aria-hidden="true"
              className={clsx(
                "w-[3px] shrink-0 rounded-full",
                item.tone === "ok" ? "bg-success" : item.tone === "warn" ? "bg-warning" : "bg-primary",
              )}
            />
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                {item.label}
              </p>
              <p className="font-numeric text-lg font-semibold text-base-content dark:text-white">{item.value}</p>
              <p className="text-xs text-base-content/70 dark:text-navy-400">{item.note}</p>
            </div>
          </div>
        ))}
      </section>

      {stats.issues > 0 && openShare >= 75 && (
        <Card accent="error" className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
          <div className="min-w-[16rem] flex-1">
            <h2 className="font-subdisplay text-[0.95rem] text-base-content dark:text-white">Auffällig</h2>
            <p className="text-sm text-base-content/80 dark:text-navy-200">
              Von {formatNumber(stats.issues)} erfassten Mängeln {closedIssues === 0
                ? "ist noch keiner"
                : closedIssues === 1
                  ? "ist erst einer"
                  : `sind erst ${formatNumber(closedIssues)}`} als
              erledigt markiert. Werden Mängel nach der Reparatur nicht abgeschlossen?
            </p>
          </div>
          <div className="min-w-[16rem] flex-1 space-y-1.5">
            <div className="flex h-3 overflow-hidden rounded-sm bg-base-200 dark:bg-navy-700" aria-hidden="true">
              <div className="bg-error" style={{ width: `${openShare}%` }} />
              <div className="bg-success" style={{ width: `${100 - openShare}%` }} />
            </div>
            <p className="flex justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
              <span>{formatNumber(stats.openIssues)} offen · {openShare} %</span>
              <span>{formatNumber(closedIssues)} erledigt</span>
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group, index) => (
          <Card key={group.title}>
            <CardHeading code={String(index + 1).padStart(2, "0")} title={group.title} />
            <dl className="divide-y divide-base-200 dark:divide-navy-700">
              {group.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <dt className="text-sm font-semibold text-base-content dark:text-white">{row.label}</dt>
                    <p className="text-xs text-base-content/70 dark:text-navy-400">{row.note}</p>
                  </div>
                  <dd className="font-numeric text-2xl font-semibold text-base-content dark:text-white">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      {sizeSeries.length > 1 && (
        <Card>
          <CardHeading
            title="Datenbestand"
            meta="Grösse der erfolgreichen Backups"
          />
          <div className="px-4 py-4">
            <div className="flex h-32 items-end gap-1.5 border-b border-base-300 dark:border-navy-600">
              {sizeSeries.map((b) => {
                const size = b.sizeBytes ?? 0;
                // Axis starts just below the smallest backup so growth is visible.
                const floor = minSize * 0.97;
                const height = Math.max(4, Math.round(((size - floor) / (maxSize - floor || 1)) * 120));
                return (
                  <div
                    key={b.id}
                    className="flex-1 rounded-t-sm bg-primary/80"
                    style={{ height }}
                    title={`${DATE_TIME.format(new Date(b.startedAt))} · ${formatMegabytes(size)}`}
                  />
                );
              })}
            </div>
            <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
              {formatMegabytes(sizeSeries[0].sizeBytes ?? 0)} → {formatMegabytes(sizeSeries[sizeSeries.length - 1].sizeBytes ?? 0)} · letzte {sizeSeries.length} erfolgreiche Backups
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
