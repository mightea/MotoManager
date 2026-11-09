import clsx from "clsx";
import type { BackupRecord } from "~/services/backups";
import { DATE_TIME, formatMegabytes } from "./admin-ui";

const DAY = new Intl.DateTimeFormat("de-CH", { day: "2-digit" });

const MAX_BAR = 85;
const MIN_BAR = 24;

/**
 * Recent backup runs as a bar strip: successful runs as green bars whose
 * height follows the archive size, skipped/failed/running runs as short stubs.
 */
export function BackupStrip({ backups }: { backups: BackupRecord[] }) {
  // API lists newest first — the strip reads left (old) → right (new).
  const runs = backups.slice(0, 15).reverse();
  const sizes = runs.filter((b) => b.status === "success" && b.sizeBytes != null).map((b) => b.sizeBytes as number);
  const min = sizes.length ? Math.min(...sizes) : 0;
  const max = sizes.length ? Math.max(...sizes) : 0;
  const hasSkipped = runs.some((b) => b.status === "skipped");
  const hasFailed = runs.some((b) => b.status === "failed");

  if (runs.length === 0) {
    return <p className="px-4 py-4 text-sm text-base-content/70 dark:text-navy-400">Noch keine Backups vorhanden.</p>;
  }

  return (
    <div className="px-4 py-4">
      <ol
        aria-label="Letzte Backup-Läufe"
        className="flex h-[90px] items-end gap-1 border-b border-base-content/40 sm:gap-1.5 dark:border-navy-600"
      >
        {runs.map((b) => {
          const when = DATE_TIME.format(new Date(b.startedAt));
          let height = 3;
          let colour = "bg-base-content/40 dark:bg-navy-400";
          let label = `${when}: übersprungen`;
          if (b.status === "success" && b.sizeBytes != null) {
            height = max > min ? Math.round(MIN_BAR + ((b.sizeBytes - min) / (max - min)) * (MAX_BAR - MIN_BAR)) : MAX_BAR * 0.6;
            colour = "bg-success";
            label = `${when}: ${formatMegabytes(b.sizeBytes)}`;
          } else if (b.status === "failed") {
            height = 6;
            colour = "bg-error";
            label = `${when}: fehlgeschlagen${b.error ? ` — ${b.error}` : ""}`;
          } else if (b.status === "running") {
            height = 6;
            colour = "bg-primary animate-pulse";
            label = `${when}: läuft`;
          }
          return (
            <li key={b.id} className="flex h-full flex-1 flex-col justify-end" title={label}>
              <span className="sr-only">{label}</span>
              <span aria-hidden="true" className={clsx("block w-full", colour)} style={{ height }} />
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="flex gap-1 pt-1.5 sm:gap-1.5">
        {runs.map((b, i) => (
          <span
            key={b.id}
            suppressHydrationWarning
            className={clsx(
              "flex-1 text-center font-mono text-[10px] text-base-content/70 dark:text-navy-400",
              i % 2 === 1 && i !== runs.length - 1 && "invisible sm:visible",
            )}
          >
            {DAY.format(new Date(b.startedAt))}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2.5 text-[13px] text-base-content/70 dark:text-navy-400">
        {sizes.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 bg-success" />
            Erfolgreich (Höhe = Grösse
            {max > min ? `, ${formatMegabytes(min)} → ${formatMegabytes(max)}` : `, ${formatMegabytes(max)}`})
          </span>
        )}
        {hasSkipped && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-[3px] w-2.5 bg-base-content/40 dark:bg-navy-400" />
            Übersprungen — keine Änderungen seit dem letzten Backup
          </span>
        )}
        {hasFailed && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-2.5 bg-error" />
            Fehlgeschlagen
          </span>
        )}
      </div>
    </div>
  );
}
