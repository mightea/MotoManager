import { fetchFromBackend } from "~/utils/backend";
import {
  type EditorIssue,
  type NewCurrentLocationRecord,
  type NewIssue,
  type NewLocation,
  type NewMaintenanceRecord,
  type NewTorqueSpecification,
  type NewPreviousOwner,
} from "~/types/db";

export async function createMotorcycle(
  token: string,
  values: FormData,
) {
  const response = await fetchFromBackend<{ motorcycle: any }>("/motorcycles", {
    method: "POST",
    body: values,
  }, token);
  return response.motorcycle;
}

export async function createIssue(token: string, values: NewIssue) {
  const response = await fetchFromBackend<{ issue: any }>(`/motorcycles/${values.motorcycleId}/issues`, {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.issue;
}

export async function createMaintenanceRecord(
  token: string,
  values: NewMaintenanceRecord,
) {
  const response = await fetchFromBackend<{ maintenanceRecord: any }>(`/motorcycles/${values.motorcycleId}/maintenance`, {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.maintenanceRecord;
}

export async function createPreviousOwner(
  token: string,
  values: NewPreviousOwner,
) {
  const response = await fetchFromBackend<{ previousOwner: any }>(`/motorcycles/${values.motorcycleId}/previous-owners`, {
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
  const response = await fetchFromBackend<{ previousOwner: any }>(`/motorcycles/${motorcycleId}/previous-owners/${ownerId}`, {
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
  } catch {
    return false;
  }
}

export async function createLocationRecord(
  token: string,
  values: NewCurrentLocationRecord,
) {
  const response = await fetchFromBackend<{ location: any }>("/locations", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.location;
}

export async function createLocation(token: string, values: NewLocation) {
  const response = await fetchFromBackend<{ location: any }>("/locations", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.location;
}

export async function createTorqueSpecification(
  token: string,
  values: NewTorqueSpecification,
) {
  const response = await fetchFromBackend<{ torqueSpec: any }>(`/motorcycles/${values.motorcycleId}/torque-specs`, {
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
  const response = await fetchFromBackend<{ motorcycle: any }>(`/motorcycles/${motorcycleId}`, {
    method: "PUT",
    body: values,
  }, token);
  return response.motorcycle;
}

export async function updateIssue(
  token: string,
  issueId: number,
  motorcycleId: number,
  values: EditorIssue,
) {
  const response = await fetchFromBackend<{ issue: any }>(`/motorcycles/${motorcycleId}/issues/${issueId}`, {
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
  } catch {
    return false;
  }
}

export async function updateMaintenanceRecord(
  token: string,
  maintenanceId: number,
  motorcycleId: number,
  values: Partial<NewMaintenanceRecord>,
) {
  const response = await fetchFromBackend<{ maintenanceRecord: any }>(`/motorcycles/${motorcycleId}/maintenance/${maintenanceId}`, {
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
  } catch {
    return false;
  }
}

export async function updateTorqueSpecification(
  token: string,
  torqueId: number,
  motorcycleId: number,
  values: Partial<NewTorqueSpecification>,
) {
  const response = await fetchFromBackend<{ torqueSpec: any }>(`/motorcycles/${motorcycleId}/torque-specs/${torqueId}`, {
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
  } catch {
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
