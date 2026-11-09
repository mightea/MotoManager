import { Link } from "react-router";
import { useState } from "react";
import { Bike } from "lucide-react";
import clsx from "clsx";
import type { MotorcycleDashboardItem as DashboardCard } from "~/utils/home-stats";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { formatNumber } from "~/utils/numberUtils";
import { getBackendAssetUrl } from "~/utils/backend";
import { formatMonthYear } from "~/components/motorcycle-hero-stats";

const INSPECTION_WARNING_DAYS = 60;
/** How many open-issue titles the card spells out before "+N weitere". */
const MAX_ISSUE_TITLES = 2;

type InspectionTier = "overdue" | "due-soon" | "ok" | "none";

/** One open issue as the garage card lists it. */
export type CardIssue = { id: number; title: string; priority: string };

interface MotorcycleCardProps {
  moto: DashboardCard;
  /** Warn the yearly-km slot when the bike's distance this year is below this. */
  minKmPerYear: number;
  /**
   * Open issues of this bike, most severe first. When omitted (issues not
   * loaded) the card falls back to the bare count from the dashboard payload.
   */
  issues?: CardIssue[];
}

/**
 * Motorcycle ID card — modeled on a service-manual file divider.
 *
 *   ┌────────────────────────────────────┐
 *   │ [flag] ID · 0004     SCHLIEREN  VET│
 *   │             [hero photo]           │
 *   │  BMW R 1200 GS · 2017              │
 *   ├──┬──────────┬──────────┬───────────┤
 *   │██│ 28'297   │ 1'703    │ 03/2026   │
 *   │  │ KM·TACHO │ KM·2026  │ MFK       │
 *   ├──┴──────────┴──────────┴───────────┤
 *   │ WARTUNG  Motoröl, Getriebeöl       │
 *   │ 2 MÄNGEL Batterie defekt · …       │
 *   └────────────────────────────────────┘
 */
export function MotorcycleCard({ moto, minKmPerYear, issues }: MotorcycleCardProps) {
  const [imageError, setImageError] = useState(false);
  const slug = createMotorcycleSlug(moto.make, moto.model);
  const [currentYear] = useState(() => new Date().getFullYear());
  const [now] = useState(() => Date.now());
  const imageUrl = getBackendAssetUrl(moto.image);
  const hasImage = Boolean(!imageError && imageUrl);
  const isActive = (moto.status ?? "active") === "active";

  const inspectionShort = moto.nextInspection?.dueDateISO
    ? formatMonthYear(moto.nextInspection.dueDateISO)
    : null;

  const inspectionTier: InspectionTier = (() => {
    if (!moto.nextInspection) return "none";
    if (moto.nextInspection.isOverdue) return "overdue";
    // /home sends dueDateISO but no day count — derive it.
    const days = moto.nextInspection.daysUntilDue
      ?? (new Date(moto.nextInspection.dueDateISO).getTime() - now) / 86_400_000;
    return days <= INSPECTION_WARNING_DAYS ? "due-soon" : "ok";
  })();

  // Flag bikes ridden less than the yearly minimum (0 disables the check).
  const belowYearlyTarget = isActive && minKmPerYear > 0 && moto.odometerThisYear < minKmPerYear;

  const maintenanceItems = moto.overdueMaintenanceItems ?? [];
  const hasMaintenance = moto.hasOverdueMaintenance;
  const issueCount = moto.numberOfIssues;
  const issueTitles = (issues ?? []).slice(0, MAX_ISSUE_TITLES).map((i) => i.title);
  const moreIssues = issueCount - issueTitles.length;
  const issueText = issueCount === 0
    ? "Keine offenen"
    : issueTitles.length > 0
      ? [...issueTitles, ...(moreIssues > 0 ? [`+${moreIssues} weitere`] : [])].join(" · ")
      : `${issueCount} offen`;

  const aria = moto.fabricationDate
    ? `${moto.make} ${moto.model} (${moto.fabricationDate})`
    : `${moto.make} ${moto.model}`;

  return (
    <Link
      to={`/motorcycle/${slug}/${moto.id}`}
      prefetch="intent"
      aria-label={aria}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out hover:border-base-content/25 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)] motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 dark:border-navy-700 dark:bg-navy-800"
    >
      {/* File tab — Dakar flag + ID, location tag and stamps on the right. */}
      <div className="flex min-h-10 items-center justify-between gap-2 px-3 py-2">
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 tabular-nums">
          <span className="motorsport-stripe block h-2 w-[22px]" aria-hidden="true" />
          ID · {String(moto.id).padStart(4, "0")}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {moto.currentLocationName && (
            <span className="truncate rounded-sm border border-base-300 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:border-navy-600">
              {moto.currentLocationName}
            </span>
          )}
          {moto.status === "sold" && (
            <span className="shrink-0 rounded-sm bg-error/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-error">
              Verkauft
            </span>
          )}
          {moto.isVeteran && <span className="stamp shrink-0 !py-0.5">Veteran</span>}
        </span>
      </div>

      {/* Hero photo with the name on a bottom scrim */}
      <div className="relative h-[200px] w-full overflow-hidden bg-base-200 dark:bg-navy-900">
        {hasImage ? (
          <img
            src={`${imageUrl}?width=800`}
            srcSet={`${imageUrl}?width=400 400w, ${imageUrl}?width=800 800w`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            alt=""
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center bg-gradient-to-br from-base-200 to-base-300 text-base-content/25 dark:from-navy-800 dark:to-navy-900"
          >
            <Bike className="h-14 w-14" strokeWidth={1.25} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,7,17,0.85)] to-transparent px-3.5 pb-2.5 pt-10 text-white">
          <h3 className="font-display text-[28px] uppercase leading-[1.05] tracking-[0.3px] line-clamp-1">
            {moto.make} {moto.model}
          </h3>
          <p className="font-mono text-[12px] tracking-[0.1em] text-white/85">
            {moto.fabricationDate ?? "Fabrikation —"}
          </p>
        </div>
      </div>

      {/* Telemetry — Tacho, km this year, MFK. A primary rail leads the row. */}
      <dl className="relative grid grid-cols-3 border-b border-base-200 dark:border-navy-700">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary/70" />
        <Slot value={formatNumber(moto.odometer)} caption="km · Tacho" className="pl-4" />
        <Slot
          value={moto.odometerThisYear > 0 ? formatNumber(moto.odometerThisYear) : "—"}
          caption={`km · ${currentYear}`}
          tone={belowYearlyTarget ? "warn" : moto.odometerThisYear > 0 ? "default" : "muted"}
          title={belowYearlyTarget ? `Unter ${formatNumber(minKmPerYear)} km in ${currentYear}` : undefined}
        />
        <Slot
          value={inspectionShort ?? "—"}
          caption={inspectionTier === "overdue" ? "MFK überfällig" : "Nächste MFK"}
          tone={
            inspectionTier === "overdue"
              ? "alert"
              : inspectionTier === "due-soon"
                ? "warn"
                : moto.nextInspection
                  ? "default"
                  : "muted"
          }
          className={clsx(
            "border-r-0",
            inspectionTier === "overdue" && "bg-error/10 dark:bg-error/20",
          )}
        />
      </dl>

      {/* Status lines — maintenance due and open issues, spelled out. Sold
          bikes carry neither (the backend no longer tracks them). */}
      {isActive && (
        <div className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
          <StatusLine
            tag="Wartung"
            tone={hasMaintenance ? "warn" : "ok"}
            text={hasMaintenance ? (maintenanceItems.length > 0 ? maintenanceItems.join(", ") : "fällig") : "Nichts fällig"}
            muted={!hasMaintenance}
          />
          <StatusLine
            tag={issueCount > 0 ? `${issueCount} ${issueCount === 1 ? "Mangel" : "Mängel"}` : "Mängel"}
            tone={issueCount > 0 ? "issue" : "ok"}
            text={issueText}
            muted={issueCount === 0}
          />
        </div>
      )}
    </Link>
  );
}

function Slot({
  value,
  caption,
  tone = "default",
  className,
  title,
}: {
  value: string;
  caption: string;
  tone?: "default" | "muted" | "warn" | "alert";
  className?: string;
  title?: string;
}) {
  const valueColor = {
    default: "text-base-content dark:text-white",
    muted: "text-base-content/40",
    warn: "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
    alert: "text-error",
  }[tone];

  return (
    <div
      title={title}
      className={clsx("min-w-0 border-r border-base-200 px-3 py-2.5 dark:border-navy-700", className)}
    >
      <dd className={clsx("truncate font-numeric text-[15px] font-bold leading-tight", valueColor)}>{value}</dd>
      <dt
        className={clsx(
          "truncate font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
          tone === "alert" ? "text-error" : "text-base-content/70",
        )}
      >
        {caption}
      </dt>
    </div>
  );
}

function StatusLine({
  tag,
  tone,
  text,
  muted,
}: {
  tag: string;
  tone: "ok" | "warn" | "issue";
  text: string;
  muted: boolean;
}) {
  const tagColor = {
    ok: "text-success",
    warn: "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
    issue: "text-secondary dark:text-navy-200",
  }[tone];
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className={clsx("shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.08em]", tagColor)}>
        {tag}
      </span>
      <span className={clsx("min-w-0 truncate", muted ? "text-base-content/70 dark:text-navy-300" : "text-base-content dark:text-white")}>
        {text}
      </span>
    </span>
  );
}
