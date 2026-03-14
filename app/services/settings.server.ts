import { fetchFromBackend } from "~/utils/backend.server";
import {
  type NewCurrencySetting,
  type NewLocation,
  type NewUserSettings,
} from "~/types/db";

export async function getUserSettings(token: string, _userId: number) {
  const response = await fetchFromBackend<{ settings: any }>("/settings", {}, token);
  return response.settings;
}

export async function updateUserSettings(
  token: string,
  _userId: number,
  values: Partial<Omit<NewUserSettings, "id" | "userId" | "updatedAt">>,
) {
  const response = await fetchFromBackend<{ settings: any }>("/settings", {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.settings;
}

export async function getLocations(token: string, _userId: number) {
  const response = await fetchFromBackend<{ locations: any[] }>("/locations", {}, token);
  return response.locations;
}

export async function createLocation(token: string, values: NewLocation) {
  const response = await fetchFromBackend<{ location: any }>("/locations", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.location;
}

export async function getCurrencies() {
  const response = await fetchFromBackend<{ currencies: any[] }>("/currencies");
  return response.currencies;
}

export async function createCurrencySetting(
  token: string,
  values: NewCurrencySetting,
) {
  const response = await fetchFromBackend<{ currency: any }>("/admin/currencies", {
    method: "POST",
    body: JSON.stringify(values),
  }, token);
  return response.currency;
}

export async function updateLocation(
  token: string,
  locationId: number,
  _userId: number,
  values: Partial<NewLocation>,
) {
  const response = await fetchFromBackend<{ location: any }>(`/locations/${locationId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.location;
}

export async function deleteLocation(
  token: string,
  locationId: number,
  _userId: number,
) {
  return fetchFromBackend<any>(`/locations/${locationId}`, {
    method: "DELETE",
  }, token);
}

export async function updateCurrencyByCode(
  _token: string,
  _code: string,
  _conversionFactor: number,
) {
  return null;
}

export async function updateCurrencySetting(
  token: string,
  currencyId: number,
  values: Partial<NewCurrencySetting>,
) {
  const response = await fetchFromBackend<{ currency: any }>(`/admin/currencies/${currencyId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, token);
  return response.currency;
}

export async function deleteCurrencySetting(
  token: string,
  currencyId: number,
) {
  return fetchFromBackend<any>(`/admin/currencies/${currencyId}`, {
    method: "DELETE",
  }, token);
}
