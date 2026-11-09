import type { CatalogTorqueSpecs } from "~/types/db";
import { ApiError, fetchFromBackend, rethrowRedirect } from "~/utils/backend";

// Torque values in the model catalog (API migration 064). Every call
// degrades: an older API answers 404, and the page then hides the catalog
// source and the share button.

/** Catalog values for a node and its compatible nodes, or `null` when the
 *  API has no catalog support (or the node isn't visible). */
export async function fetchCatalogTorqueSpecs(
  token: string,
  seriesId: number,
): Promise<CatalogTorqueSpecs | null> {
  try {
    const response = await fetchFromBackend<Partial<CatalogTorqueSpecs>>(
      `/model-series/${seriesId}/torque-specs`,
      {},
      token,
    );
    return {
      torqueSpecs: response.torqueSpecs ?? [],
      contributions: response.contributions ?? [],
    };
  } catch (error) {
    rethrowRedirect(error);
    return null;
  }
}

export async function shareTorqueSpecsToCatalog(
  token: string,
  motorcycleId: number,
): Promise<{ count: number; seriesId: number; sharedAt: string }> {
  return await fetchFromBackend(
    `/motorcycles/${motorcycleId}/torque-specs/share-catalog`,
    { method: "POST" },
    token,
  );
}

export async function removeCatalogContribution(
  token: string,
  seriesId: number,
  userId?: number,
): Promise<void> {
  const query = userId != null ? `?userId=${userId}` : "";
  await fetchFromBackend(`/model-series/${seriesId}/torque-specs${query}`, { method: "DELETE" }, token);
}

export async function importCatalogTorqueSpecs(
  token: string,
  motorcycleId: number,
  catalogSpecIds: number[],
): Promise<{ count: number; skipped: number }> {
  const response = await fetchFromBackend<{ count?: number; skipped?: number }>(
    `/motorcycles/${motorcycleId}/torque-specs/import-catalog`,
    { method: "POST", body: JSON.stringify({ catalogSpecIds }) },
    token,
  );
  return { count: response.count ?? 0, skipped: response.skipped ?? 0 };
}

/** German message for the API's catalog errors. */
export function translateCatalogTorqueError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message.includes("no model series")) {
      return "Dem Motorrad ist kein Modell aus dem Katalog zugeordnet.";
    }
    if (error.message.includes("no torque specs")) {
      return "Es gibt noch keine Anzugsmomente zum Teilen.";
    }
    if (error.status === 404) {
      return "Der Modellkatalog-Eintrag wurde nicht gefunden.";
    }
    return error.message;
  }
  return "Unbekannter Fehler.";
}
