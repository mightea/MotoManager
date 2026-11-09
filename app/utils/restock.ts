import type { PartConsumption } from "~/types/parts";

/**
 * A part only counts as "knapp" (worth restocking) when it is used often:
 * booked in more than this many repairs (service records). One-off parts
 * at one piece or none are no reason to buy. Same rule as the iOS app's
 * shopping list (`RestockRule` in PartsPlanning.swift).
 */
export const FREQUENT_REPAIR_USES = 3;

/** Number of distinct repairs each part was booked in. Bookings without a
 *  service record and deleted bookings don't count. */
export function repairUsesByPart(
  consumptions: Pick<PartConsumption, "partId" | "maintenanceRecordId" | "deletedAt">[],
): Map<number, number> {
  const records = new Map<number, Set<number>>();
  for (const consumption of consumptions) {
    if (consumption.maintenanceRecordId == null || consumption.deletedAt) continue;
    const set = records.get(consumption.partId) ?? new Set<number>();
    set.add(consumption.maintenanceRecordId);
    records.set(consumption.partId, set);
  }
  return new Map([...records].map(([partId, set]) => [partId, set.size]));
}

export function isFrequentlyUsed(repairUses: number): boolean {
  return repairUses > FREQUENT_REPAIR_USES;
}

/** "empty"/"low" only for frequently used parts at one piece or none. */
export function restockTone(onHand: number, repairUses: number): "empty" | "low" | "ok" {
  if (!isFrequentlyUsed(repairUses) || onHand > 1) return "ok";
  return onHand <= 0 ? "empty" : "low";
}
