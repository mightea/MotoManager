import type { HeroStat } from "~/components/motorcycle-detail-header";
import type { Issue, MaintenanceRecord, Motorcycle } from "~/types/db";
import type { NextInspectionInfo } from "~/utils/inspection";
import { formatNumber } from "~/utils/numberUtils";

type HeroInput = {
  motorcycle: Pick<
    Motorcycle,
    "initialOdo" | "manualOdo" | "fabricationDate" | "purchaseDate" | "hasUnknownOwners" | "status"
  >;
  maintenanceRecords?: MaintenanceRecord[] | null;
  issues?: Pick<Issue, "odo">[] | null;
  /** Number of recorded previous owners (the rider is owner N + 1). */
  previousOwnerCount?: number | null;
  nextInspection: Pick<NextInspectionInfo, "dueDateISO" | "isOverdue"> | null;
  /** Include the "km · <year>" figure (overview only — sub-pages stay compact). */
  includeYearKm?: boolean;
};

export type MotorcycleHero = {
  stats: HeroStat[];
  /** Short facts for the line under the title, e.g. "Baujahr 2017", "1. Hand". */
  facts: string[];
};

/** "07/2032" — month and full year, so a 2-digit year never reads as a day. */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", { month: "2-digit", year: "numeric" })
    .format(new Date(iso))
    .replace(".", "/");
}

/**
 * Hero figures shared by every motorcycle page (overview, documents,
 * Werkstattdaten, parts), derived from the `/motorcycles/:id` payload only:
 * Tacho, km this year, Ø consumption and the next MFK.
 */
export function buildMotorcycleHero({
  motorcycle,
  maintenanceRecords,
  issues,
  previousOwnerCount,
  nextInspection,
  includeYearKm = false,
}: HeroInput): MotorcycleHero {
  const records = maintenanceRecords ?? [];
  const initialOdo = motorcycle.initialOdo || 0;
  const odo = Math.max(
    0,
    ...[initialOdo, motorcycle.manualOdo, ...records.map((r) => r.odo), ...(issues ?? []).map((i) => i.odo)]
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
  );

  const stats: HeroStat[] = [];
  if (odo > 0) stats.push({ label: "km · Tacho", value: formatNumber(odo) });

  if (includeYearKm) {
    // Same rule as the garage card (/home): distance since the highest
    // reading dated before this year, floored at the purchase odometer.
    const year = new Date().getFullYear();
    const startOfYearOdo = records
      .filter((r) => r.date && new Date(r.date).getFullYear() < year)
      .reduce((max, r) => Math.max(max, r.odo || 0), initialOdo);
    const kmThisYear = odo - startOfYearOdo;
    if (kmThisYear > 0) {
      stats.push({ label: `km · ${year}`, value: formatNumber(kmThisYear), hideOnMobile: true });
    }
  }

  // Partial fills carry no consumption of their own (it lands on the next full tank).
  const fills = records.filter(
    (r) => r.type === "fuel" && r.fuelAmount && r.tripDistance && r.fuelConsumption != null,
  );
  if (fills.length > 0) {
    const avg = fills.reduce((sum, r) => sum + (r.fuelConsumption || 0), 0) / fills.length;
    stats.push({ label: "Ø L/100 km", value: avg.toFixed(2) });
  }

  if (nextInspection) {
    stats.push({
      label: nextInspection.isOverdue ? "MFK überfällig" : "Nächste MFK",
      value: formatMonthYear(nextInspection.dueDateISO),
      tone: nextInspection.isOverdue ? "alert" : "default",
    });
  }

  const facts: string[] = [];
  if (motorcycle.fabricationDate) facts.push(`Baujahr ${motorcycle.fabricationDate}`);
  if (!motorcycle.hasUnknownOwners && previousOwnerCount != null) {
    facts.push(`${previousOwnerCount + 1}. Hand`);
  }
  if (motorcycle.purchaseDate && (motorcycle.status ?? "active") === "active") {
    const years = (Date.now() - new Date(motorcycle.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years > 0.1) facts.push(`${years.toFixed(1)} Jahre im Besitz`);
  }

  return { stats, facts };
}
