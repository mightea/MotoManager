import { v4 as uuidv4 } from "uuid";
import { fetchFromBackend, rethrowRedirect } from "~/utils/backend";
import type {
  ModelSeries,
  NewPart,
  NewPartConsumption,
  NewPartStock,
  Part,
  PartConsumption,
  PartStock,
  PublicPart,
  StorageLocation,
} from "~/types/parts";

// Creates carry a client-generated `clientId` so a retried request is
// idempotent on the server (same pattern as the iOS sync client).

// MARK: Model series

export async function fetchModelSeries(token: string): Promise<ModelSeries[]> {
  const response = await fetchFromBackend<{ modelSeries: ModelSeries[] }>(
    "/model-series",
    {},
    token,
  );
  return response.modelSeries;
}

export async function createModelSeries(
  token: string,
  values: { name: string; manufacturer?: string },
): Promise<ModelSeries> {
  const response = await fetchFromBackend<{ modelSeries: ModelSeries }>(
    "/model-series",
    { method: "POST", body: JSON.stringify(values) },
    token,
  );
  return response.modelSeries;
}

// MARK: Storage locations

export async function fetchStorageLocations(token: string): Promise<StorageLocation[]> {
  const response = await fetchFromBackend<{ storageLocations: StorageLocation[] }>(
    "/storage-locations",
    {},
    token,
  );
  return response.storageLocations;
}

export async function createStorageLocation(
  token: string,
  values: { name: string; parentId?: number | null; locationId?: number | null },
): Promise<StorageLocation> {
  const response = await fetchFromBackend<{ storageLocation: StorageLocation }>(
    "/storage-locations",
    { method: "POST", body: JSON.stringify({ ...values, clientId: uuidv4() }) },
    token,
  );
  return response.storageLocation;
}

export async function updateStorageLocation(
  token: string,
  id: number,
  // locationId: undefined = keep, null = clear, number = set.
  values: { name?: string; parentId?: number | null; locationId?: number | null },
): Promise<StorageLocation> {
  const response = await fetchFromBackend<{ storageLocation: StorageLocation }>(
    `/storage-locations/${id}`,
    { method: "PUT", body: JSON.stringify(values) },
    token,
  );
  return response.storageLocation;
}

export async function deleteStorageLocation(token: string, id: number): Promise<boolean> {
  try {
    await fetchFromBackend(`/storage-locations/${id}`, { method: "DELETE" }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

// MARK: Parts

export async function fetchParts(token: string): Promise<Part[]> {
  const response = await fetchFromBackend<{ parts: Part[] }>("/parts", {}, token);
  return response.parts;
}

export async function fetchPublicParts(
  token: string,
  query?: string | null,
  seriesId?: number | null,
): Promise<PublicPart[]> {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (seriesId != null) params.set("seriesId", String(seriesId));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetchFromBackend<{ parts: PublicPart[] }>(
    `/parts/public${suffix}`,
    {},
    token,
  );
  return response.parts;
}

export async function createPart(token: string, values: NewPart): Promise<Part> {
  const response = await fetchFromBackend<{ part: Part }>(
    "/parts",
    { method: "POST", body: JSON.stringify({ ...values, clientId: uuidv4() }) },
    token,
  );
  return response.part;
}

export async function updatePart(
  token: string,
  id: number,
  values: Partial<NewPart>,
): Promise<Part> {
  const response = await fetchFromBackend<{ part: Part }>(
    `/parts/${id}`,
    { method: "PUT", body: JSON.stringify(values) },
    token,
  );
  return response.part;
}

export async function uploadPartImage(token: string, id: number, image: File): Promise<Part> {
  const formData = new FormData();
  formData.append("image", image);
  const response = await fetchFromBackend<{ part: Part }>(
    `/parts/${id}/image`,
    { method: "POST", body: formData },
    token,
  );
  return response.part;
}

export async function deletePartImage(token: string, id: number): Promise<Part> {
  const response = await fetchFromBackend<{ part: Part }>(
    `/parts/${id}/image`,
    { method: "DELETE" },
    token,
  );
  return response.part;
}

export async function deletePart(token: string, id: number): Promise<boolean> {
  try {
    await fetchFromBackend(`/parts/${id}`, { method: "DELETE" }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

// MARK: Part stocks

export async function fetchPartStocks(token: string, partId?: number): Promise<PartStock[]> {
  const suffix = partId != null ? `?partId=${partId}` : "";
  const response = await fetchFromBackend<{ partStocks: PartStock[] }>(
    `/part-stocks${suffix}`,
    {},
    token,
  );
  return response.partStocks;
}

export async function createPartStock(token: string, values: NewPartStock): Promise<PartStock> {
  const response = await fetchFromBackend<{ partStock: PartStock }>(
    "/part-stocks",
    { method: "POST", body: JSON.stringify({ ...values, clientId: uuidv4() }) },
    token,
  );
  return response.partStock;
}

export async function updatePartStock(
  token: string,
  id: number,
  values: Partial<Omit<NewPartStock, "partId">>,
): Promise<PartStock> {
  const response = await fetchFromBackend<{ partStock: PartStock }>(
    `/part-stocks/${id}`,
    { method: "PUT", body: JSON.stringify(values) },
    token,
  );
  return response.partStock;
}

export async function deletePartStock(token: string, id: number): Promise<boolean> {
  try {
    await fetchFromBackend(`/part-stocks/${id}`, { method: "DELETE" }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

// MARK: Part consumptions

export async function fetchPartConsumptions(
  token: string,
  filter?: { partId?: number; maintenanceRecordId?: number },
): Promise<PartConsumption[]> {
  const params = new URLSearchParams();
  if (filter?.partId != null) params.set("partId", String(filter.partId));
  if (filter?.maintenanceRecordId != null) {
    params.set("maintenanceRecordId", String(filter.maintenanceRecordId));
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetchFromBackend<{ partConsumptions: PartConsumption[] }>(
    `/part-consumptions${suffix}`,
    {},
    token,
  );
  return response.partConsumptions;
}

export async function createPartConsumption(
  token: string,
  values: NewPartConsumption,
): Promise<PartConsumption> {
  const response = await fetchFromBackend<{ partConsumption: PartConsumption }>(
    "/part-consumptions",
    { method: "POST", body: JSON.stringify({ ...values, clientId: uuidv4() }) },
    token,
  );
  return response.partConsumption;
}

export async function deletePartConsumption(token: string, id: number): Promise<boolean> {
  try {
    await fetchFromBackend(`/part-consumptions/${id}`, { method: "DELETE" }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}
