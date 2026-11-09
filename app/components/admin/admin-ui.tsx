import type { ReactNode } from "react";
import clsx from "clsx";
import { formatNumber } from "~/utils/numberUtils";
import type { BackupRecord } from "~/services/backups";
import type { PublicUser } from "~/types/auth";

export type Tone = "ok" | "warn" | "info" | "plum" | "muted";

const RAIL: Record<Tone, string> = {
  ok: "bg-success",
  warn: "bg-[var(--color-workshop)]",
  info: "bg-primary",
  plum: "bg-secondary",
  muted: "bg-base-content/30",
};

const NOTE: Record<Tone, string> = {
  ok: "text-success",
  warn: "text-warning",
  info: "text-base-content/70 dark:text-navy-400",
  plum: "text-base-content/70 dark:text-navy-400",
  muted: "text-base-content/70 dark:text-navy-400",
};

export interface StatusItem {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  /** Colour the note in the tone (status tiles) instead of the neutral grey. */
  toneNote?: boolean;
}

/** The row of status tiles under the page head: rail · mono label · mono value · note. */
export function StatusStrip({ items, label }: { items: StatusItem[]; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex gap-2.5 rounded-sm border border-base-300/70 bg-base-100 px-3.5 py-3 dark:border-navy-700 dark:bg-navy-800"
        >
          <span aria-hidden="true" className={clsx("w-[3px] shrink-0 rounded-sm", RAIL[item.tone])} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400">
              {item.label}
            </dt>
            <dd suppressHydrationWarning className="truncate font-mono text-xl font-bold leading-tight text-base-content dark:text-white">
              {item.value}
            </dd>
            <span suppressHydrationWarning className={clsx("text-[13px]", item.toneNote ? NOTE[item.tone] : NOTE.muted)}>
              {item.note}
            </span>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Card title in the boards' style: Plex 700, 15px, upper-case, 0.06em. */
export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-base-content dark:text-white">
      {children}
    </h2>
  );
}

/** Card head: title + one line of context on the left, actions on the right. */
export function SectionHead({
  id,
  title,
  count,
  description,
  actions,
}: {
  id?: string;
  title: string;
  count?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 px-4 py-3.5 dark:border-navy-700">
      <div className="min-w-0">
        <SectionTitle id={id}>
          {title}
          {count != null && (
            <span className="font-mono text-xs font-semibold text-base-content/70 dark:text-navy-400"> · {count}</span>
          )}
        </SectionTitle>
        {description && (
          <p suppressHydrationWarning className="text-[13px] text-base-content/70 dark:text-navy-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const MICRO_LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400";

export const DATE_TIME = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE_TIME = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" });

export function formatMegabytes(bytes: number): string {
  return `${formatNumber(bytes / 1_000_000, 1)} MB`;
}

export function formatDuration(start: string, end: string | null): string | null {
  if (!end) return null;
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (isNaN(secs) || secs < 0) return null;
  if (secs < 60) return `${secs} s`;
  return `${Math.floor(secs / 60)} min ${secs % 60} s`;
}

function daysAgo(iso: string): number {
  const then = new Date(iso);
  const today = new Date();
  then.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

export function relativeDays(iso: string): string {
  const days = daysAgo(iso);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

/** "heute 10:27" / "gestern 10:27" / "08.11. 10:27" — for context lines. */
export function formatRecent(iso: string): string {
  const days = daysAgo(iso);
  if (days <= 0) return `heute ${TIME.format(new Date(iso))}`;
  if (days === 1) return `gestern ${TIME.format(new Date(iso))}`;
  return SHORT_DATE_TIME.format(new Date(iso)).replace(",", "");
}

/** Newest successful backup that produced an archive. Backups come newest first. */
export function latestSuccessfulBackup(backups: BackupRecord[] | undefined): BackupRecord | null {
  return backups?.find((b) => b.status === "success" && b.sizeBytes != null) ?? null;
}

/** Size + duration note for a backup tile, e.g. "113.1 MB · 16 s". */
export function backupNote(backup: BackupRecord): string {
  const parts = [backup.sizeBytes != null ? formatMegabytes(backup.sizeBytes) : null, formatDuration(backup.startedAt, backup.finishedAt)];
  return parts.filter(Boolean).join(" · ");
}

/** Highest iOS build any user last signed in with, plus its version string. */
export function latestAppBuild(users: PublicUser[]): { build: number; version: string | null } | null {
  let latest: PublicUser | null = null;
  for (const u of users) {
    if (u.appBuild != null && (latest?.appBuild == null || u.appBuild > latest.appBuild)) latest = u;
  }
  return latest?.appBuild != null ? { build: latest.appBuild, version: latest.appVersion ?? null } : null;
}

export function formatAppVersion(version: string | null | undefined, build: number | null | undefined): string {
  if (!version && build == null) return "–";
  if (!version) return `Build ${build}`;
  return build != null ? `${version} (${build})` : version;
}
