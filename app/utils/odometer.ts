import type { OdometerChange } from "~/types/db";

/**
 * Odometer changes: every stored `odo` is the total distance the bike has run.
 * After a replaced instrument the number on the bike differs from that total by
 * the offset of all changes dated on or before the day in question. Forms take
 * the instrument reading and submit it with `odoOffset: 0`; the server adds the
 * offset. These helpers do the same maths for display and for prefilling.
 */

type ChangeLike = Pick<OdometerChange, "date" | "readingBefore" | "readingAfter">;

const day = (date: string) => date.slice(0, 10);

/** Offset in force on `date` (changes on that day already count). */
export function odometerOffsetAt(changes: ChangeLike[] | null | undefined, date: string | null | undefined): number {
  if (!changes || changes.length === 0 || !date) return 0;
  const target = day(date);
  return changes
    .filter((change) => day(change.date) <= target)
    .reduce((sum, change) => sum + (change.readingBefore - change.readingAfter), 0);
}

/** What the instrument showed for a stored total on `date`. */
export function toInstrumentReading(
  total: number,
  changes: ChangeLike[] | null | undefined,
  date: string | null | undefined,
): number {
  return total - odometerOffsetAt(changes, date);
}

/** Stored total for an instrument reading taken on `date`. */
export function toTotalOdometer(
  reading: number,
  changes: ChangeLike[] | null | undefined,
  date: string | null | undefined,
): number {
  return reading + odometerOffsetAt(changes, date);
}

/** Local calendar day as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${dayOfMonth}`;
}
