import { modelSeriesDisplayName, type ModelSeries } from "~/types/parts";

// Helpers for the hierarchical model catalog (Familie -> Serie -> Modell).
// All walks are depth-capped so malformed data can never hang the UI.

const MAX_WALK = 6;

export const SERIES_LEVEL_LABELS = ["Familie", "Serie", "Modell"] as const;

/** 0-based depth of a node (Familie = 0). */
export function seriesDepth(node: ModelSeries, all: ModelSeries[]): number {
  let depth = 0;
  let current = node;
  for (let i = 0; i < MAX_WALK; i++) {
    const parent = all.find((candidate) => candidate.id === current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

export function seriesLevelLabel(depth: number): string {
  return SERIES_LEVEL_LABELS[Math.min(depth, SERIES_LEVEL_LABELS.length - 1)];
}

/** "R-Modelle 2V (1978-1996) › R 80 GS, R 100 GS, PD (90-95)" */
export function seriesPath(node: ModelSeries, all: ModelSeries[]): string {
  const names = [modelSeriesDisplayName(node)];
  let current = node;
  for (let i = 0; i < MAX_WALK; i++) {
    const parent = all.find((candidate) => candidate.id === current.parentId);
    if (!parent) break;
    names.unshift(modelSeriesDisplayName(parent));
    current = parent;
  }
  return names.join(" › ");
}

/** Depth-first flattening of the catalog: children grouped under their
 *  parents, siblings sorted by manufacturer + name. Orphans (parent not
 *  visible) surface at root level rather than disappearing. */
export function seriesTree(all: ModelSeries[]): { node: ModelSeries; depth: number }[] {
  const knownIds = new Set(all.map((node) => node.id));
  const childrenOf = new Map<number | null, ModelSeries[]>();
  for (const node of all) {
    const key = node.parentId != null && knownIds.has(node.parentId) ? node.parentId : null;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), node]);
  }
  for (const children of childrenOf.values()) {
    children.sort(
      (a, b) =>
        a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name),
    );
  }

  const result: { node: ModelSeries; depth: number }[] = [];
  const visit = (parentId: number | null, depth: number) => {
    if (depth >= MAX_WALK) return;
    for (const node of childrenOf.get(parentId) ?? []) {
      result.push({ node, depth });
      visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** Ancestors-or-self plus all descendants of a node — the set of nodes a
 *  link to `seriesId` is compatible with. Mirrors the backend's matching. */
export function compatibleSeriesIds(seriesId: number, all: ModelSeries[]): Set<number> {
  const matches = new Set<number>();

  let current = all.find((node) => node.id === seriesId);
  for (let i = 0; i < MAX_WALK && current; i++) {
    matches.add(current.id);
    current = all.find((node) => node.id === current!.parentId);
  }
  if (matches.size === 0) matches.add(seriesId);

  let frontier = [seriesId];
  for (let i = 0; i < MAX_WALK && frontier.length > 0; i++) {
    const next = all
      .filter((node) => node.parentId != null && frontier.includes(node.parentId))
      .map((node) => node.id)
      .filter((id) => !matches.has(id));
    for (const id of next) matches.add(id);
    frontier = next;
  }

  return matches;
}

/** Does a part (linked to `partSeriesIds`) fit a bike assigned to
 *  `bikeSeriesId`? Hierarchy-aware: any link on the bike node's
 *  ancestor/descendant chain matches. */
export function seriesMatchesBike(
  partSeriesIds: number[],
  bikeSeriesId: number,
  all: ModelSeries[],
): boolean {
  const compatible = compatibleSeriesIds(bikeSeriesId, all);
  return partSeriesIds.some((id) => compatible.has(id));
}
