import { fetchFromBackend, rethrowRedirect } from "~/utils/backend";
import { invalidatePrefix } from "~/utils/request-cache";
import {
  type EditorIssue,
  type Issue,
  type Location,
  type MaintenanceRecord,
  type Motorcycle,
  type NewCurrentLocationRecord,
  type NewIssue,
  type NewLocation,
  type NewMaintenanceRecord,
  type NewTirePressure,
  type NewTorqueSpecification,
  type NewPreviousOwner,
  type PreviousOwner,
  type TirePressure,
  type TorqueSpecification,
} from "~/types/db";

export async function createMotorcycle(
  token: string,
  values: FormData,
) {
  const response = await fetchFromBackend<{ motorcycle: Motorcycle }>("/motorcycles", {
    method: "POST",
    body: values,
  }, token);
  return response.motorcycle;
}

export async function createIssue(token: string, values: NewIssue) {
  const response = await fetchFromBackend<{ issue: Issue }>(`/motorcycles/${values.motorcycleId}/issues`, {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.issue;
}

export async function createMaintenanceRecord(
  token: string,
  values: NewMaintenanceRecord,
) {
  const response = await fetchFromBackend<{ maintenanceRecord: MaintenanceRecord }>(`/motorcycles/${values.motorcycleId}/maintenance`, {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.maintenanceRecord;
}

export async function createPreviousOwner(
  token: string,
  values: NewPreviousOwner,
) {
  const response = await fetchFromBackend<{ previousOwner: PreviousOwner }>(`/motorcycles/${values.motorcycleId}/previous-owners`, {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.previousOwner;
}

export async function updatePreviousOwner(
  token: string,
  ownerId: number,
  motorcycleId: number,
  values: Partial<NewPreviousOwner>,
) {
  const response = await fetchFromBackend<{ previousOwner: PreviousOwner }>(`/motorcycles/${motorcycleId}/previous-owners/${ownerId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.previousOwner;
}

export async function deletePreviousOwner(
  token: string,
  ownerId: number,
  motorcycleId: number,
) {
  try {
    await fetchFromBackend(`/motorcycles/${motorcycleId}/previous-owners/${ownerId}`, {
      method: "DELETE",
    }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

export async function createLocationRecord(
  token: string,
  values: NewCurrentLocationRecord,
) {
  const response = await fetchFromBackend<{ location: Location }>("/locations", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  invalidatePrefix("locations:");
  return response.location;
}

export async function createLocation(token: string, values: NewLocation) {
  const response = await fetchFromBackend<{ location: Location }>("/locations", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  invalidatePrefix("locations:");
  return response.location;
}

export async function createTorqueSpecification(
  token: string,
  values: NewTorqueSpecification,
) {
  const response = await fetchFromBackend<{ torqueSpec: TorqueSpecification }>(`/motorcycles/${values.motorcycleId}/torque-specs`, {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.torqueSpec;
}

export async function updateMotorcycle(
  token: string,
  motorcycleId: number,
  _userId: number,
  values: FormData,
) {
  const response = await fetchFromBackend<{ motorcycle: Motorcycle }>(`/motorcycles/${motorcycleId}`, {
    method: "PUT",
    body: values,
  }, token);
  return response.motorcycle;
}

/**
 * Persist just the "ownership history incomplete" flag. The motorcycle update
 * endpoint is multipart and merges absent fields (absent = keep), so a payload
 * carrying only this flag leaves every other field untouched — letting the
 * previous-owners dialog toggle it independently of the main edit form's Save.
 */
export async function updateMotorcycleUnknownOwners(
  token: string,
  motorcycleId: number,
  hasUnknownOwners: boolean,
) {
  const formData = new FormData();
  formData.append("hasUnknownOwners", hasUnknownOwners ? "true" : "false");
  const response = await fetchFromBackend<{ motorcycle: Motorcycle }>(`/motorcycles/${motorcycleId}`, {
    method: "PUT",
    body: formData,
  }, token);
  return response.motorcycle;
}

export async function updateIssue(
  token: string,
  issueId: number,
  motorcycleId: number,
  values: EditorIssue,
) {
  const response = await fetchFromBackend<{ issue: Issue }>(`/motorcycles/${motorcycleId}/issues/${issueId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.issue;
}

export async function deleteIssue(
  token: string,
  issueId: number,
  motorcycleId: number,
) {
  try {
    await fetchFromBackend(`/motorcycles/${motorcycleId}/issues/${issueId}`, {
      method: "DELETE",
    }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

export async function updateMaintenanceRecord(
  token: string,
  maintenanceId: number,
  motorcycleId: number,
  values: Partial<NewMaintenanceRecord>,
) {
  const response = await fetchFromBackend<{ maintenanceRecord: MaintenanceRecord }>(`/motorcycles/${motorcycleId}/maintenance/${maintenanceId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.maintenanceRecord;
}

export async function deleteMaintenanceRecord(
  token: string,
  maintenanceId: number,
  motorcycleId: number,
) {
  try {
    await fetchFromBackend(`/motorcycles/${motorcycleId}/maintenance/${maintenanceId}`, {
      method: "DELETE",
    }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

export async function updateTorqueSpecification(
  token: string,
  torqueId: number,
  motorcycleId: number,
  values: Partial<NewTorqueSpecification>,
) {
  const response = await fetchFromBackend<{ torqueSpec: TorqueSpecification }>(`/motorcycles/${motorcycleId}/torque-specs/${torqueId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.torqueSpec;
}

export async function deleteTorqueSpecification(
  token: string,
  torqueId: number,
  motorcycleId: number,
) {
  try {
    await fetchFromBackend(`/motorcycles/${motorcycleId}/torque-specs/${torqueId}`, {
      method: "DELETE",
    }, token);
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

/* ============================================================
   Tire pressure — 1:1 with a motorcycle.

   Backend contract:
   - GET    /motorcycles/:id/tire-pressure  → { tirePressure: TirePressure | null }
   - PUT    /motorcycles/:id/tire-pressure  → { tirePressure: TirePressure }     (upsert)
   - DELETE /motorcycles/:id/tire-pressure  → { success: true }
   ============================================================ */

export async function getTirePressure(
  token: string,
  motorcycleId: number,
): Promise<TirePressure | null> {
  const response = await fetchFromBackend<{ tirePressure: TirePressure | null }>(
    `/motorcycles/${motorcycleId}/tire-pressure`,
    {},
    token,
  );
  return response.tirePressure;
}

export async function upsertTirePressure(
  token: string,
  motorcycleId: number,
  values: Omit<NewTirePressure, "motorcycleId">,
): Promise<TirePressure> {
  const response = await fetchFromBackend<{ tirePressure: TirePressure }>(
    `/motorcycles/${motorcycleId}/tire-pressure`,
    {
      method: "PUT",
      body: JSON.stringify({ ...values, motorcycleId }),
    },
    token,
  );
  return response.tirePressure;
}

export async function deleteTirePressure(
  token: string,
  motorcycleId: number,
): Promise<boolean> {
  try {
    await fetchFromBackend(
      `/motorcycles/${motorcycleId}/tire-pressure`,
      { method: "DELETE" },
      token,
    );
    return true;
  } catch (error) {
    rethrowRedirect(error);
    return false;
  }
}

export async function deleteMotorcycleCascade(
  token: string,
  motorcycleId: number,
) {
  await fetchFromBackend(`/motorcycles/${motorcycleId}`, {
    method: "DELETE",
  }, token);
}
