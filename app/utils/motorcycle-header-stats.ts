import type { NextInspectionInfo } from "./inspection";
import { getNextInspectionInfo } from "./inspection";
import { getLocations } from "~/services/settings";

export type MotorcycleHeaderStats = {
  nextInspection: NextInspectionInfo | null;
  currentLocationName: string | null;
};

/**
 * Derive the contextual stats the MotorcycleDetailHeader renders
 * (next-inspection countdown and current storage location) from the raw
 * `/motorcycles/:id` response. Called by every motorcycle sub-route
 * loader (overview, documents, torque-specs) so the header reads exactly
 * the same on every tab and the layout does not shift on navigation.
 */
export async function computeMotorcycleHeaderStats(
  motoResponse: any,
  token: string,
  userId: number,
): Promise<MotorcycleHeaderStats> {
  const motorcycle = motoResponse?.motorcycle;
  const maintenanceRecords: any[] = Array.isArray(motoResponse?.maintenanceRecords)
    ? motoResponse.maintenanceRecords
    : [];

  const lastInspection: string | null = maintenanceRecords
    .filter((entry) => entry.type === "inspection" && entry.date)
    .map((entry) => entry.date as string)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .at(0) ?? null;

  const nextInspection = getNextInspectionInfo({
    firstRegistration: motorcycle?.firstRegistration ?? null,
    lastInspection,
    isVeteran: motorcycle?.isVeteran ?? false,
  });

  const userLocations = await getLocations(token, userId);
  // "Where the bike lives" → only Storage-typed locations qualify.
  const storageLocationIds = new Set(
    userLocations.filter((l: any) => l.type === "storage").map((l: any) => l.id),
  );
  const currentLocationId =
    maintenanceRecords
      .filter(
        (r) => r.type === "location" && r.locationId && storageLocationIds.has(r.locationId),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.locationId ??
    null;
  const currentLocationName =
    userLocations.find((l: any) => l.id === currentLocationId)?.name ?? null;

  return { nextInspection, currentLocationName };
}
