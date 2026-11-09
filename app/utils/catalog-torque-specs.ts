import type {
  CatalogTorqueContribution,
  CatalogTorqueSpec,
  TorqueSpecification,
} from "~/types/db";

/** Same identity the API uses to skip duplicates on import:
 *  category + name (trimmed, case-insensitive) + exact torque. */
export function torqueDuplicateKey(spec: Pick<TorqueSpecification, "category" | "name" | "torque">): string {
  return `${spec.category.trim().toLowerCase()}\u0000${spec.name.trim().toLowerCase()}\u0000${spec.torque}`;
}

/** Catalog values grouped by category (sorted), values by name. */
export function groupCatalogByCategory(
  specs: CatalogTorqueSpec[],
): { category: string; specs: CatalogTorqueSpec[] }[] {
  const groups = new Map<string, CatalogTorqueSpec[]>();
  for (const spec of specs) {
    groups.set(spec.category, [...(groups.get(spec.category) ?? []), spec]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "de-CH"))
    .map(([category, list]) => ({
      category,
      specs: [...list].sort((a, b) => a.name.localeCompare(b.name, "de-CH") || a.id - b.id),
    }));
}

/** The caller's own contribution on exactly this node, if any. */
export function ownContribution(
  contributions: CatalogTorqueContribution[],
  seriesId: number,
): CatalogTorqueContribution | null {
  return contributions.find((c) => c.isOwn && c.seriesId === seriesId) ?? null;
}

/** "09.11.2026" */
export function formatShareDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
