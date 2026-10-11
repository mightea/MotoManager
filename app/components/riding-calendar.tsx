import { useId } from "react";
import clsx from "clsx";
import { formatNumber } from "~/utils/numberUtils";
import { buildCalendarGrid, formatDate, formatDateShort } from "~/utils/map-analysis";
import type { CalendarDay } from "~/types/map";

interface RidingCalendarProps {
  year: number;
  days: CalendarDay[];
  seasonStart: string | null;
  seasonEnd: string | null;
  /** Hide the year caption when the parent already names the year. */
  hideCaption?: boolean;
}

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const LEFT = 22;
const TOP = 16;
const WEEKDAY_LABELS: [number, string][] = [
  [0, "Mo"],
  [2, "Mi"],
  [4, "Fr"],
];

/** Sequential single-hue ramp (primary) for the km intensity, stepped for both themes. */
const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "fill-base-300/60 dark:fill-navy-700/70",
  1: "fill-primary/25 dark:fill-primary/35",
  2: "fill-primary/50 dark:fill-primary/55",
  3: "fill-primary/75 dark:fill-primary/80",
  4: "fill-primary dark:fill-primary",
};

/**
 * GitHub-style riding calendar: one square per day, Monday-first columns,
 * intensity = km ridden that day (the km of every leg that ended that day).
 * Season start/end get a ring so the first and last ride of the year stand out.
 */
export function RidingCalendar({ year, days, seasonStart, seasonEnd, hideCaption = false }: RidingCalendarProps) {
  const grid = buildCalendarGrid(year, days);
  const descId = useId();
  const width = LEFT + grid.weeks * STEP;
  const height = TOP + 7 * STEP;
  const seasonStartDay = seasonStart?.slice(0, 10) ?? null;
  const seasonEndDay = seasonEnd?.slice(0, 10) ?? null;

  return (
    <figure className="space-y-2">
      {!hideCaption && (
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-white">{year}</span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
            {grid.ridingDays} Fahrtage · {formatNumber(grid.totalKm)} km
          </span>
        </figcaption>
      )}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          aria-describedby={descId}
          className="block text-base-content/55 dark:text-navy-400"
        >
          <title>{`Fahrkalender ${year}`}</title>
          <desc id={descId}>
            {grid.ridingDays} Fahrtage im Jahr {year}, insgesamt {formatNumber(grid.totalKm)} km.
            {seasonStartDay && seasonEndDay
              ? ` Saison vom ${formatDate(seasonStartDay)} bis ${formatDate(seasonEndDay)}.`
              : ""}
          </desc>
          {grid.monthLabels.map(([week, label]) => (
            <text
              key={`${label}-${week}`}
              x={LEFT + week * STEP}
              y={10}
              fontSize="9"
              fontFamily="var(--font-mono)"
              fill="currentColor"
            >
              {label}
            </text>
          ))}
          {WEEKDAY_LABELS.map(([weekday, label]) => (
            <text
              key={label}
              x={0}
              y={TOP + weekday * STEP + CELL - 2}
              fontSize="9"
              fontFamily="var(--font-mono)"
              fill="currentColor"
            >
              {label}
            </text>
          ))}
          {grid.cells.map((cell) => {
            const x = LEFT + cell.week * STEP;
            const y = TOP + cell.weekday * STEP;
            const isSeasonEdge = cell.date === seasonStartDay || cell.date === seasonEndDay;
            const title =
              cell.stops > 0
                ? `${formatDate(cell.date)}: ${formatNumber(cell.km)} km · ${formatNumber(cell.liters, 1)} l · ${cell.stops} Tankstopp${cell.stops === 1 ? "" : "s"}`
                : `${formatDate(cell.date)}: keine Fahrt`;
            return (
              <rect
                key={cell.date}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={2}
                className={clsx(
                  LEVEL_CLASS[cell.level],
                  isSeasonEdge && "stroke-accent",
                )}
                strokeWidth={isSeasonEdge ? 1.5 : 0}
                tabIndex={cell.stops > 0 ? 0 : -1}
                aria-label={title}
              >
                <title>{title}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
        <span>
          {seasonStartDay && seasonEndDay
            ? `Saison ${formatDateShort(seasonStartDay)} – ${formatDateShort(seasonEndDay)}`
            : "Keine Fahrten"}
        </span>
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          weniger
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <svg key={level} width={CELL} height={CELL} className="inline-block">
              <rect width={CELL} height={CELL} rx={2} className={LEVEL_CLASS[level]} />
            </svg>
          ))}
          mehr
        </span>
      </div>
    </figure>
  );
}
