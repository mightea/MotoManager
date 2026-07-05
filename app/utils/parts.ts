import type { Location } from "~/types/db";
import { modelSeriesDisplayName, type ModelSeries, type StorageLocation } from "~/types/parts";

/** "Garage › Regal A › Kiste 3" for a leaf location; depth-capped so a
 *  (server-rejected) cycle can never hang the UI. */
export function storageLocationPath(
  location: StorageLocation,
  all: StorageLocation[],
): string {
  const names = [location.name];
  let current = location;
  for (let depth = 0; depth < 10; depth++) {
    const parent = all.find((candidate) => candidate.id === current.parentId);
    if (!parent) break;
    names.unshift(parent.name);
    current = parent;
  }
  return names.join(" › ");
}

/** The root of a storage location's tree (depth-capped like the path). */
export function storageLocationRoot(
  location: StorageLocation,
  all: StorageLocation[],
): StorageLocation {
  let current = location;
  for (let depth = 0; depth < 10; depth++) {
    const parent = all.find((candidate) => candidate.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/** The physical place (garage/workshop) a storage location lives at — taken
 *  from the tree root's link into the locations entity. */
export function storageLocationPlace(
  location: StorageLocation,
  all: StorageLocation[],
  places: Location[],
): Location | null {
  const root = storageLocationRoot(location, all);
  if (root.locationId == null) return null;
  return places.find((place) => place.id === root.locationId) ?? null;
}

/** Display names for a part's fitment, e.g. ["R 1150 GS", "K 75"]. */
export function seriesNames(seriesIds: number[], allSeries: ModelSeries[]): string[] {
  return seriesIds
    .map((id) => allSeries.find((series) => series.id === id))
    .filter((series): series is ModelSeries => series != null)
    .map(modelSeriesDisplayName);
}
