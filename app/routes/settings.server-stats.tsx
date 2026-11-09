import { Link, useLoaderData } from "react-router";
import { listUsers, requireUser } from "~/services/auth";
import { formatNumber } from "~/utils/numberUtils";
import type { Route } from "./+types/settings.server-stats";
import clsx from "clsx";
import { fetchFromBackend } from "~/utils/backend";
import { getVersion } from "~/config";
import { listBackups, type BackupOverview } from "~/services/backups";
import type { PublicUser } from "~/types/auth";
import { PageHeader } from "~/components/page-header";
import { Card } from "~/components/card";
import {
  MICRO_LABEL,
  SectionHead,
  StatusStrip,
  backupNote,
  formatAppVersion,
  formatMegabytes,
  formatRecent,
  latestSuccessfulBackup,
  type StatusItem,
} from "~/components/admin/admin-ui";

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

  // Health, backups and the user list are context for the counters — they are
  // admin-only or may fail, and must not take the page down, so all degrade to null.
  const [response, health, backups, users] = await Promise.all([
    fetchFromBackend<ServerStatsResponse>("/stats", {}, token),
    fetchFromBackend<{ status: string; version: string }>("/health").catch(() => null),
    listBackups(token).catch((): BackupOverview | null => null),
    listUsers(token).catch((): PublicUser[] | null => null),
  ]);

  const { stats, avgMotoPerUser, avgDocsPerUser } = response;

  return {
    stats: stats.global,
    avgMotoPerUser,
    avgDocsPerUser,
    health,
    backups,
    users,
    instance: window.location.host,
    loadedAt: new Date().toISOString(),
  };
}

const DAY_MONTH = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" });
const DATE = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

const SEVEN_DAYS = 7 * 86_400_000;

export default function ServerStats() {
  const { stats, avgMotoPerUser, avgDocsPerUser, health, backups, users, instance, loadedAt } =
    useLoaderData<typeof clientLoader>();

  const healthy = health?.status === "ok";
  const now = Date.parse(loadedAt);
  const lastBackup = latestSuccessfulBackup(backups?.backups);
  // A scheduled backup is overdue once two intervals have passed without a success.
  const backupOverdue =
    backups?.config.enabled === true &&
    (!backups.lastSuccessAt ||
      now - new Date(backups.lastSuccessAt).getTime() > 2 * backups.config.intervalHours * 3_600_000);
  const problems = [!healthy && "API", backupOverdue && "Backup"].filter(Boolean) as string[];

  const closedIssues = stats.issues - stats.openIssues;
  const openShare = stats.issues > 0 ? Math.round((stats.openIssues / stats.issues) * 100) : 0;
  const activeLastWeek = users?.filter(
    (u) => u.lastLoginAt && now - new Date(u.lastLoginAt).getTime() <= SEVEN_DAYS,
  ).length;

  const system: StatusItem[] = [
    {
      label: "API",
      value: health?.version ?? "–",
      note: healthy ? "Health ok" : "nicht erreichbar",
      tone: healthy ? "ok" : "warn",
    },
    { label: "Web-App", value: getVersion(), note: "diese Oberfläche", tone: "ok" },
    {
      label: "Letztes Backup",
      value: backups?.lastSuccessAt ? formatRecent(backups.lastSuccessAt) : "–",
      note: lastBackup ? backupNote(lastBackup) : backups ? "noch keins" : "nur für Admins",
      tone: backups && !backupOverdue && backups.lastSuccessAt ? "ok" : "warn",
    },
    {
      label: "Benutzer",
      value: formatNumber(stats.users),
      note: activeLastWeek != null ? `${formatNumber(activeLastWeek)} in den letzten 7 Tagen aktiv` : "auf dieser Instanz",
      tone: "info",
    },
    ...(lastBackup?.sizeBytes != null
      ? [
          {
            label: "Datenbestand",
            value: `${formatNumber(lastBackup.sizeBytes / 1_000_000)} MB`,
            note: "laut letztem Backup",
            tone: "plum" as const,
          },
        ]
      : []),
  ];

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
        { label: "Orte", value: formatNumber(stats.locations), note: "Garagen, Werkstätten, Tankstellen, Prüfstellen" },
      ],
    },
  ];

  const context = [`Instanz ${instance}`, `${formatNumber(stats.users)} Benutzer`, `Stand ${DATE.format(new Date(loadedAt))}`].join(" · ");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pt-4 pb-20 sm:pt-10">
      <PageHeader
        eyebrow={
          <>
            <Link to="/settings/admin" className="hover:text-primary hover:underline">
              Admin
            </Link>{" "}
            › Server
          </>
        }
        title="Server-Statistiken"
        description={<span suppressHydrationWarning>{context}</span>}
        actions={
          <span
            className={clsx(
              "inline-flex h-9 items-center gap-2 border px-3 font-mono text-xs font-bold uppercase tracking-[0.08em]",
              problems.length === 0
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            <span
              aria-hidden="true"
              className={clsx("h-2 w-2 rounded-full", problems.length === 0 ? "bg-success" : "bg-warning")}
            />
            {problems.length === 0 ? "Alle Systeme OK" : `Prüfen: ${problems.join(", ")}`}
          </span>
        }
      />

      <section aria-labelledby="system-h" className="space-y-2.5">
        <h2 id="system-h" className={clsx(MICRO_LABEL, "flex items-center gap-2.5 tracking-[0.1em]")}>
          <span aria-hidden="true" className="h-px w-6 bg-base-content/40" />
          System
        </h2>
        <StatusStrip label="System" items={system} />
      </section>

      {stats.issues > 0 && openShare >= 75 && (
        <Card accent="error" className="flex flex-wrap items-center gap-x-8 gap-y-4 py-4 pr-[18px] pl-[22px]">
          <div className="min-w-0 flex-[1_1_300px]">
            <h2 className="text-[15px] font-bold uppercase tracking-[0.06em] text-base-content dark:text-white">Auffällig</h2>
            <p className="mt-0.5 text-sm text-base-content dark:text-navy-100">
              Von {formatNumber(stats.issues)} erfassten Mängeln{" "}
              {closedIssues === 0 ? (
                "ist noch keiner"
              ) : closedIssues === 1 ? (
                <>
                  ist erst <strong>1</strong>
                </>
              ) : (
                <>
                  sind erst <strong>{formatNumber(closedIssues)}</strong>
                </>
              )}{" "}
              als erledigt markiert. Werden Mängel nach der Reparatur nicht abgeschlossen?
            </p>
          </div>
          <div className="min-w-0 flex-[1_1_300px] space-y-1.5">
            <div className="flex h-3.5" aria-hidden="true">
              <div className="bg-accent" style={{ width: `${openShare}%` }} />
              <div className="bg-success" style={{ width: `${100 - openShare}%` }} />
            </div>
            <p className="flex justify-between font-mono text-xs uppercase text-base-content/70 dark:text-navy-400">
              <span>
                {formatNumber(stats.openIssues)} offen · {openShare} %
              </span>
              <span>{formatNumber(closedIssues)} erledigt</span>
            </p>
          </div>
        </Card>
      )}

      <div className="grid items-start gap-4 md:grid-cols-2">
        {groups.map((group, index) => (
          <Card key={group.title}>
            <div className="flex items-baseline justify-between gap-3 border-b border-base-200 px-4 py-3.5 dark:border-navy-700">
              <h2 className="text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-base-content dark:text-white">
                {group.title}
              </h2>
              <span className="font-mono text-xs text-base-content/70 dark:text-navy-400">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <dl className="divide-y divide-base-200 dark:divide-navy-700">
              {group.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-[11px]">
                  <dt className="text-sm font-semibold text-base-content dark:text-white">{row.label}</dt>
                  <dd className="row-span-2 text-right font-mono text-2xl font-bold text-base-content dark:text-white">
                    {row.value}
                  </dd>
                  <span className="text-[13px] text-base-content/70 dark:text-navy-400">{row.note}</span>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      {(backups || users) && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {backups && <BackupSizeCard overview={backups} />}
          {users && <VersionsCard users={users} />}
        </div>
      )}
    </div>
  );
}

/** Size of the successful backups over time — the instance's data volume. */
function BackupSizeCard({ overview }: { overview: BackupOverview }) {
  const series = overview.backups
    .filter((b) => b.status === "success" && b.sizeBytes != null)
    .slice(0, 12)
    .reverse();

  if (series.length < 2) {
    return (
      <Card>
        <SectionHead title="Datenbestand · Backup-Grösse" description="Grösse der erfolgreichen Backups." />
        <p className="px-4 py-4 text-sm text-base-content/70 dark:text-navy-400">
          Für einen Verlauf braucht es mindestens zwei erfolgreiche Backups.
        </p>
      </Card>
    );
  }

  const sizes = series.map((b) => (b.sizeBytes as number) / 1_000_000);
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  // The axis starts at a round value below the smallest backup so growth stays visible.
  const step = max - min > 50 ? 50 : 10;
  const floor = Math.max(0, Math.floor((min - (max - min) * 0.1) / step) * step);
  const span = max - floor || 1;
  const first = series[0];
  const last = series[series.length - 1];
  const growth = (last.sizeBytes as number) - (first.sizeBytes as number);
  const maxIndex = sizes.indexOf(max);

  return (
    <Card>
      <SectionHead
        title="Datenbestand · Backup-Grösse"
        description={`Grösse der letzten ${series.length} erfolgreichen Backups (DB + Bilder + Dokumente).`}
      />
      <div className="px-4 py-4">
        <ol aria-label="Backup-Grössen" className="flex h-[140px] items-end gap-1 border-b border-base-content/40 dark:border-navy-600">
          {series.map((b, i) => {
            const mb = sizes[i];
            const height = Math.max(4, Math.round(((mb - floor) / span) * 118));
            const showLabel = i === 0 || i === series.length - 1 || i === maxIndex;
            return (
              <li key={b.id} className="flex h-full flex-1 flex-col items-center justify-end">
                <span
                  className={clsx(
                    "pb-0.5 font-mono text-[10px] text-base-content/70 dark:text-navy-400",
                    !showLabel && "sr-only",
                  )}
                >
                  {formatNumber(mb, 1)}
                  <span className="sr-only"> MB am {DAY_MONTH.format(new Date(b.startedAt))}</span>
                </span>
                <span aria-hidden="true" className="block w-full bg-primary" style={{ height }} />
              </li>
            );
          })}
        </ol>
        <div aria-hidden="true" className="flex gap-1 pt-1.5">
          {series.map((b, i) => (
            <span
              key={b.id}
              suppressHydrationWarning
              className={clsx(
                "flex-1 text-center font-mono text-[10px] text-base-content/70 dark:text-navy-400",
                i % 2 === 1 && i !== series.length - 1 && "invisible sm:visible",
              )}
            >
              {DAY_MONTH.format(new Date(b.startedAt))}
            </span>
          ))}
        </div>
        <p suppressHydrationWarning className={clsx(MICRO_LABEL, "mt-2")}>
          {growth >= 0 ? "+" : "−"}
          {formatMegabytes(Math.abs(growth))} seit {DAY_MONTH.format(new Date(first.startedAt))}. · Achse ab{" "}
          {formatNumber(floor)} MB
        </p>
      </div>
    </Card>
  );
}

/** iOS app versions in use, from each user's last app login. */
function VersionsCard({ users }: { users: PublicUser[] }) {
  const byBuild = new Map<string, { label: string; build: number; who: string[] }>();
  const noApp: string[] = [];
  for (const u of users) {
    if (u.appBuild == null && !u.appVersion) {
      noApp.push(u.username);
      continue;
    }
    const key = `${u.appVersion ?? ""}|${u.appBuild ?? ""}`;
    const entry = byBuild.get(key) ?? { label: formatAppVersion(u.appVersion, u.appBuild), build: u.appBuild ?? 0, who: [] };
    entry.who.push(u.username);
    byBuild.set(key, entry);
  }
  const versions = [...byBuild.values()].sort((a, b) => b.build - a.build);
  const rows = [
    ...versions.map((v, i) => ({
      label: v.label,
      who: v.who,
      fill: i === 0 ? "bg-success" : "bg-[var(--color-workshop)]",
    })),
    ...(noApp.length > 0 ? [{ label: "keine App", who: noApp, fill: "bg-base-300 dark:bg-navy-600" }] : []),
  ];
  const total = users.length || 1;

  return (
    <Card>
      <SectionHead title="Versionen im Einsatz" description="iOS-App je Benutzer beim letzten Login." />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex h-[18px] gap-0.5" aria-hidden="true">
          {rows.map((r) => (
            <div key={r.label} className={r.fill} style={{ width: `${(r.who.length / total) * 100}%` }} />
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5">
              <span aria-hidden="true" className={clsx("h-2.5 w-2.5", r.fill)} />
              <span className="font-mono text-sm text-base-content dark:text-white">{r.label}</span>
              <span className="truncate text-[13px] text-base-content/70 dark:text-navy-400">{r.who.join(", ")}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/settings/admin#ios-app"
          className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:underline"
        >
          Update-Erinnerung einstellen →
        </Link>
      </div>
    </Card>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
