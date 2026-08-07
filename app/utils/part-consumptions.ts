import type { PartConsumption } from "~/types/parts";

/** One line of the maintenance form's "Verwendete Teile" section. */
export interface UsedPartEntry {
  partId: number;
  quantity: number;
}

/**
 * What has to happen to bring a maintenance record's consumptions in line with
 * the part list the form submitted.
 *
 * Split out from the route so the reconciliation is a pure, testable function:
 * the route only performs the resulting calls.
 */
export interface ConsumptionPlan {
  create: UsedPartEntry[];
  update: { id: number; quantity: number }[];
  /** Consumption ids to tomb-stone (the part was taken off the entry). */
  remove: number[];
}

/**
 * Parse the form's `usedParts` hidden field.
 *
 * Anything malformed is dropped rather than throwing: this is a hidden field on
 * a form that has already saved the record by the time it is read, so a bad
 * payload must not take the whole submission down. Quantities must be whole and
 * at least 1 — the server rejects anything else anyway.
 */
export function parseUsedParts(raw: unknown): UsedPartEntry[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<number>();
  const entries: UsedPartEntry[] = [];
  for (const candidate of parsed) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const { partId, quantity } = candidate as { partId?: unknown; quantity?: unknown };
    if (typeof partId !== "number" || !Number.isFinite(partId)) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;
    // The picker cannot produce a duplicate part, but a hand-crafted payload
    // could — and two rows for one part would book it twice.
    if (seen.has(partId)) continue;
    seen.add(partId);
    entries.push({ partId, quantity });
  }
  return entries;
}

/**
 * Diff the submitted part list against the consumptions already booked.
 *
 * An entry whose quantity is unchanged is deliberately left out of the plan: a
 * no-op PUT would still bump the record's `partsCost`/`updatedAt` server-side
 * and churn sync for every client.
 *
 * Consumptions are keyed by part, which matches how the form models them (one
 * row per part). If a record somehow holds two consumptions of the same part,
 * the first keeps the quantity and the rest are removed, collapsing it back to
 * the one-row-per-part shape rather than silently double-counting.
 */
export function planConsumptionChanges(
  existing: PartConsumption[],
  submitted: UsedPartEntry[],
): ConsumptionPlan {
  const desired = new Map(submitted.map((entry) => [entry.partId, entry.quantity]));
  const plan: ConsumptionPlan = { create: [], update: [], remove: [] };
  const handled = new Set<number>();

  for (const consumption of existing) {
    const quantity = desired.get(consumption.partId);
    if (quantity === undefined || handled.has(consumption.partId)) {
      plan.remove.push(consumption.id);
      continue;
    }
    handled.add(consumption.partId);
    if (quantity !== consumption.quantity) {
      plan.update.push({ id: consumption.id, quantity });
    }
  }

  for (const entry of submitted) {
    if (!handled.has(entry.partId)) plan.create.push(entry);
  }

  return plan;
}
