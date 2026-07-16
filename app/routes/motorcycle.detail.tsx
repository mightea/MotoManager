import { lazy, Suspense, useState, useEffect, useRef } from "react";
import {
  data,
  redirect,
  useRevalidator,
  useActionData,
  useSubmit,
  useLocation,
  useParams,
} from "react-router";
import type { Route } from "./+types/motorcycle.detail";
import {
  type NewMaintenanceRecord,
  type MaintenanceType,
  type LocationType,
  type TirePosition,
  type BatteryType,
  type FluidType,
  type NewIssue,
  type Issue,
  type NewPreviousOwner
} from "~/types/db";
import { requireUser } from "~/services/auth";
import { Plus } from "lucide-react";
import OpenIssuesCard from "~/components/open-issues-card";
import { MaintenanceList } from "~/components/maintenance-list";
import { MaintenanceDialog } from "~/components/maintenance-dialog";
import { IssueDialog } from "~/components/issue-dialog";
import { MaintenanceInsightsCard } from "~/components/maintenance-insights";
import { Modal } from "~/components/modal";
// Lazy-loaded: pulls in react-easy-crop, which only appears inside the edit modal.
const AddMotorcycleForm = lazy(() =>
  import("~/components/add-motorcycle-form").then((m) => ({
    default: m.AddMotorcycleForm,
  })),
);
import { motorcycleSchema, previousOwnerSchema } from "~/validations";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { getCurrencies, getLocations, getUserSettings } from "~/services/settings";
import { getMaintenanceInsights } from "~/utils/maintenance-intervals";
import { getNextInspectionInfo } from "~/utils/inspection";
import { listExpenses } from "~/services/expenses";
import { formatCurrency } from "~/utils/numberUtils";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { PreviousOwnerDialog } from "~/components/previous-owner-dialog";
import { PreviousOwnersDialog } from "~/components/previous-owners-dialog";
import { MotorcycleInfoCard } from "~/components/motorcycle-info-card";
import { Card, CardAction, CardHeading } from "~/components/card";
import { fetchFromBackend } from "~/utils/backend";
import { seriesMatchesBike } from "~/utils/series";
import {
  createPartConsumption,
  fetchModelSeries,
  fetchPartConsumptions,
  fetchParts,
} from "~/services/parts";
import { useUmami } from "~/components/umami-provider";
import { toast } from "~/hooks/use-toast";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.motorcycle) {
    return [{ title: "Fahrzeug nicht gefunden - Moto Manager" }];
  }
  const { make, model } = data.motorcycle;
  return [
    { title: `${make} ${model} - Moto Manager` },
    { name: "description", content: `Details, Historie und Mängel für ${make} ${model}.` },
  ];
}

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = parseInt(params.id, 10);

  if (isNaN(motorcycleId)) {
    throw new Response("Invalid Motorcycle ID", { status: 400 });
  }

  // All requests are independent — fire them in parallel. The parts trio backs
  // the Baureihe select, the "Verwendete Teile" picker, and the per-record
  // consumption display; failures degrade to empty lists instead of blocking.
  const [response, settings, userLocations, currencies, allExpenses, modelSeries, parts, partConsumptions] =
    await Promise.all([
      fetchFromBackend<any>(`/motorcycles/${motorcycleId}`, {}, token),
      getUserSettings(token, user.id),
      getLocations(token, user.id),
      getCurrencies(),
      listExpenses(token),
      fetchModelSeries(token).catch(() => []),
      fetchParts(token).catch(() => []),
      fetchPartConsumptions(token).catch(() => []),
    ]);
  const motorcycle = response?.motorcycle;
  const issues = Array.isArray(response?.issues) ? response.issues : [];
  const maintenanceRecords = Array.isArray(response?.maintenanceRecords) ? response.maintenanceRecords : [];
  const previousOwners = Array.isArray(response?.previousOwners) ? response.previousOwners : [];

  if (!motorcycle) {
    throw new Response("Motorrad nicht gefunden.", { status: 404 });
  }

  const openIssues = issues.filter((i: any) => i.status !== "done");
  const maintenanceHistory = maintenanceRecords;
  const previousOwnersList = previousOwners;
  const ownerCount = previousOwners.length + 1;

  // Calculate last known ODO
  const odometerCandidates = [
    motorcycle.initialOdo,
    motorcycle.manualOdo,
    ...maintenanceRecords.map((r: any) => r.odo),
    ...issues.map((i: any) => i.odo),
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const lastKnownOdo = Math.max(0, ...odometerCandidates);

  // Get maintenance insights
  const insights = getMaintenanceInsights(maintenanceRecords, lastKnownOdo, settings);

  // "Where the bike lives" → only Storage-typed locations qualify. Workshop / fuel /
  // inspection visits do not change the current location.
  const storageLocationIds = new Set(
    userLocations.filter((l: any) => l.type === "storage").map((l: any) => l.id),
  );
  const currentLocationId =
    maintenanceRecords
      .filter(
        (r: any) =>
          r.type === "location" && r.locationId && storageLocationIds.has(r.locationId),
      )
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      ?.locationId ?? null;
  const currentLocationName =
    userLocations.find((l: any) => l.id === currentLocationId)?.name ?? null;

  // Fuel stats
  const fuelRecords = maintenanceRecords.filter((r: any) => r.type === "fuel" && r.fuelAmount && r.tripDistance);
  const avgFuelConsumption = fuelRecords.length > 0 
    ? fuelRecords.reduce((sum: number, r: any) => sum + (r.fuelConsumption || 0), 0) / fuelRecords.length 
    : null;
  const avgTripDistance = fuelRecords.length > 0
    ? fuelRecords.reduce((sum: number, r: any) => sum + (r.tripDistance || 0), 0) / fuelRecords.length
    : null;
  const estimatedRange = avgFuelConsumption && motorcycle.fuelTankSize 
    ? (motorcycle.fuelTankSize / avgFuelConsumption) * 100 
    : null;

  // Ownership stats
  const hasPurchaseDate = !!motorcycle.purchaseDate;
  const yearsOwned = motorcycle.purchaseDate 
    ? (new Date().getTime() - new Date(motorcycle.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : 0;
  const kmDriven = lastKnownOdo - (motorcycle.initialOdo || 0);
  const avgKmPerYear = yearsOwned > 0.1 ? kmDriven / yearsOwned : null;
  const ownershipLabel = yearsOwned > 0 ? `${yearsOwned.toFixed(1)} Jahre` : null;

  const formattedPurchaseDate = motorcycle.purchaseDate 
    ? new Date(motorcycle.purchaseDate).toLocaleDateString("de-CH") 
    : null;
  const formattedFirstRegistration = motorcycle.firstRegistration 
    ? new Date(motorcycle.firstRegistration).toLocaleDateString("de-CH") 
    : null;

  const lastInspection = maintenanceRecords
    .filter((entry: any) => entry.type === "inspection" && entry.date)
    .map((entry: any) => entry.date as string)
    .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
    .at(0) ?? null;

  const nextInspection = getNextInspectionInfo({
    firstRegistration: motorcycle.firstRegistration,
    lastInspection,
    isVeteran: motorcycle.isVeteran ?? false,
  });

  // Shared expenses for this motorcycle
  const motorcycleExpenses = allExpenses.filter(e => e.motorcycleIds?.includes(motorcycleId));

  // Calculate total costs
  const maintenanceCost = maintenanceHistory.reduce((sum: number, r: any) => sum + (r.normalizedCost || 0), 0);
  const purchasePrice = motorcycle.normalizedPurchasePrice || 0;
  const sharedExpensesCost = motorcycleExpenses.reduce((sum: number, e: any) => {
    const factor = e.motorcycleIds?.length || 1;
    const currency = currencies.find((c: any) => c.code === e.currency);
    const normalizedAmount = e.amount * (currency?.conversionFactor || 1);
    return sum + (normalizedAmount / factor);
  }, 0);
  const totalLifetimeCost = purchasePrice + maintenanceCost + sharedExpensesCost;

  return data({
    motorcycle,
    openIssues,
    maintenanceHistory,
    motorcycleExpenses,
    totalLifetimeCost,
    previousOwnersList,
    ownerCount,
    nextInspection,
    lastKnownOdo,
    insights,
    userLocations,
    currentLocationName,
    currencies,
    modelSeries,
    parts,
    partConsumptions,
    ownershipLabel,
    kmDriven,
    avgKmPerYear,
    yearsOwned,
    avgFuelConsumption,
    avgTripDistance,
    estimatedRange,
    formattedPurchaseDate,
    formattedFirstRegistration,
    hasPurchaseDate
  });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user, token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const parseString = (value: FormDataEntryValue | null | undefined) =>
    typeof value === "string" && value.length > 0 ? value : null;

  const parseNumber = (value: FormDataEntryValue | null | undefined) => {
    if (!value) return null;
    const strVal = String(value);
    if (strVal.trim() === "") return null;
    const parsed = Number.parseFloat(strVal);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const isValidPriority = (value: FormDataEntryValue | null): NewIssue["priority"] => {
    if (value === "high" || value === "medium" || value === "low") {
      return value;
    }
    return "medium";
  };
  const isValidStatus = (value: FormDataEntryValue | null): Issue["status"] => {
    if (value === "new" || value === "in_progress" || value === "done") {
      return value;
    }
    return "new";
  };

  const {
    createIssue,
    createMaintenanceRecord,
    deleteIssue,
    updateIssue,
    updateMaintenanceRecord,
    createLocation,
    updateMotorcycle,
    deleteMotorcycleCascade,
    deleteMaintenanceRecord,
    createPreviousOwner,
    updatePreviousOwner,
    deletePreviousOwner,
    updateMotorcycleUnknownOwners,
  } = await import("~/services/motorcycles");

  // Fetch currencies for normalization via backend
  const currencies = await getCurrencies();
  const getCurrencyFactor = (code: string | null | undefined) => {
    if (!code) return 1;
    const currency = currencies.find((c: any) => c.code === code);
    return currency ? currency.conversionFactor : 1;
  };

  if (intent === "updateMotorcycle") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }

    const rawData = Object.fromEntries(formData);
    const validationResult = motorcycleSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const formattedErrors: Record<string, string> = {};
      for (const key of Object.keys(errors)) {
        const fieldKey = key as keyof typeof errors;
        if (errors[fieldKey]) {
          formattedErrors[key] = errors[fieldKey]![0];
          }
          }
          return data({ errors: formattedErrors }, { status: 400 });
          }

          const {      purchasePrice,
      currencyCode,
      salePrice,
      saleCurrencyCode,
    } = validationResult.data;

    // Empty field = clear: propagate the clear to the normalized value too,
    // otherwise a removed purchase price would leave a stale normalized one.
    if (purchasePrice == null) {
      formData.set("normalizedPurchasePrice", "");
    } else {
      const normalizedPurchasePrice = purchasePrice * getCurrencyFactor(currencyCode);
      formData.set("normalizedPurchasePrice", normalizedPurchasePrice.toString());
    }

    // Same normalization for the sale price.
    if (salePrice == null) {
      formData.set("normalizedSalePrice", "");
    } else {
      const normalizedSalePrice = salePrice * getCurrencyFactor(saleCurrencyCode);
      formData.set("normalizedSalePrice", normalizedSalePrice.toString());
    }

    const updated = await updateMotorcycle(
      token,
      motorcycleId,
      user.id,
      formData,
    );

    if (!updated) {
      throw new Response("Motorrad nicht gefunden.", { status: 404 });
    }

    return data({ success: true, intent: "updateMotorcycle" });
  }

  if (intent === "deleteMotorcycle") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }

    await deleteMotorcycleCascade(token, motorcycleId);

    return redirect("/");
  }

  if (intent === "createIssue") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const odo = Number(formData.get("odo"));
    const title = parseString(formData.get("title"));
    const description = parseString(formData.get("description"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(odo) || !title) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    const issueData: NewIssue = {
      motorcycleId,
      odo,
      title,
      description,
      priority: isValidPriority(formData.get("priority")),
      status: isValidStatus(formData.get("status")),
      date: parseString(formData.get("date")),
    };

    await createIssue(token, issueData);

    return data({ success: true, intent: "createIssue" });
  }

  if (intent === "updateIssue") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const issueId = Number(formData.get("issueId"));
    const odo = Number(formData.get("odo"));
    const title = parseString(formData.get("title"));
    const description = parseString(formData.get("description"));

    if (
      !Number.isFinite(motorcycleId) ||
      !Number.isFinite(issueId) ||
      !Number.isFinite(odo) ||
      !title
    ) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    await updateIssue(token, issueId, motorcycleId, {
      odo,
      title,
      description,
      priority: isValidPriority(formData.get("priority")),
      status: isValidStatus(formData.get("status")),
      date: parseString(formData.get("date")),
    });

    return data({ success: true, intent: "updateIssue" });
  }

  if (intent === "deleteIssue") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const issueId = Number(formData.get("issueId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(issueId)) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    await deleteIssue(token, issueId, motorcycleId);

    return data({ success: true, intent: "deleteIssue" });
  }

  if (intent === "createMaintenance" || intent === "updateMaintenance") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    const type = formData.get("type") as MaintenanceType;
    let locationId: number | undefined = undefined;
    const rawLocationId = formData.get("locationId");
    if (typeof rawLocationId === "string" && rawLocationId.trim() !== "") {
      const parsed = Number(rawLocationId);
      if (Number.isFinite(parsed)) {
        locationId = parsed;
      }
    }
    const newLocationName = parseString(formData.get("newLocationName"));

    const maintenanceTypeToLocationType: Partial<Record<MaintenanceType, LocationType>> = {
      location: "storage",
      service: "maintenanceShop",
      fuel: "fuelStation",
      inspection: "inspection",
    };

    if (newLocationName) {
      const locationType = maintenanceTypeToLocationType[type] ?? "fuelStation";
      // Coordinates only present when the "near me" flow created this station;
      // a manually typed name submits no coords and keeps the no-coords path.
      const newLocationLatitude = parseNumber(formData.get("newLocationLatitude"));
      const newLocationLongitude = parseNumber(formData.get("newLocationLongitude"));
      const newLoc = await createLocation(token, {
        name: newLocationName,
        type: locationType,
        userId: user.id,
        ...(newLocationLatitude != null && newLocationLongitude != null
          ? { latitude: newLocationLatitude, longitude: newLocationLongitude }
          : {}),
      });
      if (newLoc) {
        locationId = newLoc.id;
      }
    }

    const recordData: any = {
      motorcycleId,
      type,
      date: String(formData.get("date")),
      odo: Number(formData.get("odo")),
      cost: parseNumber(formData.get("cost")),
      currency: parseString(formData.get("currency")),
      description: parseString(formData.get("description")),
      brand: parseString(formData.get("brand")),
      model: parseString(formData.get("model")),
      tirePosition: parseString(formData.get("tirePosition")) as TirePosition | undefined,
      tireSize: parseString(formData.get("tireSize")),
      dotCode: parseString(formData.get("dotCode")),
      batteryType: parseString(formData.get("batteryType")) as BatteryType | undefined,
      fluidType: parseString(formData.get("fluidType")) as FluidType | undefined,
      viscosity: parseString(formData.get("viscosity")),
      locationId: locationId,
      fuelType: parseString(formData.get("fuelType")),
      fuelAmount: parseNumber(formData.get("fuelAmount")),
      pricePerUnit: parseNumber(formData.get("pricePerUnit")),
      normalizedCost: (parseNumber(formData.get("cost")) || 0) * getCurrencyFactor(parseString(formData.get("currency"))),
      bundledItems: formData.getAll("bundledItems[]") as string[],
    };

    if (intent === "createMaintenance") {
      const created = await createMaintenanceRecord(token, recordData as NewMaintenanceRecord);

      // Book the selected parts against the new entry. The record is already
      // saved at this point, so a failed consumption (e.g. a concurrent
      // overdraw) surfaces as a warning instead of rolling anything back.
      const usedPartsRaw = formData.get("usedParts");
      if (typeof usedPartsRaw === "string" && usedPartsRaw.trim() !== "" && created?.id) {
        let usedParts: { partId: number; quantity: number }[] = [];
        try {
          usedParts = JSON.parse(usedPartsRaw);
        } catch {
          usedParts = [];
        }
        const failures: string[] = [];
        for (const entry of usedParts) {
          if (!Number.isFinite(entry.partId) || !Number.isInteger(entry.quantity) || entry.quantity < 1) {
            continue;
          }
          try {
            // eslint-disable-next-line no-await-in-loop
            await createPartConsumption(token, {
              partId: entry.partId,
              quantity: entry.quantity,
              maintenanceRecordId: created.id,
            });
          } catch (error) {
            if (error instanceof Response) throw error;
            failures.push(String(entry.partId));
          }
        }
        if (failures.length > 0) {
          return data({
            success: true,
            intent: "createMaintenance",
            error: "Eintrag gespeichert, aber nicht alle Teile konnten vom Bestand abgebucht werden (nicht genug Bestand?).",
          });
        }
      }
    } else {
      const maintenanceId = Number(formData.get("maintenanceId"));
      await updateMaintenanceRecord(token, maintenanceId, motorcycleId, recordData);
    }

    return data({ success: true, intent: intent === "createMaintenance" ? "createMaintenance" : "updateMaintenance" });
  }

  if (intent === "deleteMaintenance") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const maintenanceId = Number(formData.get("maintenanceId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(maintenanceId)) {
      throw new Response("Ungültige Fahrzeug- oder Wartungs-ID", { status: 400 });
    }

    await deleteMaintenanceRecord(token, maintenanceId, motorcycleId);

    return data({ success: true, intent: "deleteMaintenance" });
  }

  if (intent === "deleteMaintenanceBulk") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }

    const rawIds = formData.getAll("maintenanceIds[]");
    const ids = rawIds
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));

    if (ids.length === 0) {
      return data({ success: false, intent: "deleteMaintenanceBulk", error: "Keine Einträge ausgewählt" }, { status: 400 });
    }

    // Sequential, not parallel: SQLite has a single writer, so firing N
    // concurrent DELETEs makes most of them lose the lock with SQLITE_BUSY.
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const ok = await deleteMaintenanceRecord(token, id, motorcycleId);
        if (ok) succeeded += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    if (failed > 0 && succeeded === 0) {
      return data({ success: false, intent: "deleteMaintenanceBulk", error: `${failed} Einträge konnten nicht gelöscht werden` }, { status: 500 });
    }

    return data({ success: true, intent: "deleteMaintenanceBulk", count: succeeded, failed });
  }

  if (intent === "createPreviousOwner" || intent === "updatePreviousOwner") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }

    const rawData = Object.fromEntries(formData);
    const validationResult = previousOwnerSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const formattedErrors: Record<string, string> = {};
      for (const key in errors) {
        const fieldErrors = errors[key as keyof typeof errors];
        if (fieldErrors && fieldErrors.length > 0) {
          formattedErrors[key] = fieldErrors[0];
        }
      }
      return data({ errors: formattedErrors }, { status: 400 });
    }

    const ownerData: NewPreviousOwner = {
      motorcycleId,
      ...validationResult.data,
      address: validationResult.data.address ?? null,
      city: validationResult.data.city ?? null,
      postcode: validationResult.data.postcode ?? null,
      country: validationResult.data.country ?? null,
      phoneNumber: validationResult.data.phoneNumber ?? null,
      email: (validationResult.data.email as string | null) ?? null,
      comments: validationResult.data.comments ?? null,
    };

    if (intent === "createPreviousOwner") {
      await createPreviousOwner(token, ownerData);
    } else {
      const ownerId = Number(formData.get("ownerId"));
      if (!Number.isFinite(ownerId)) {
        throw new Response("Ungültige Vorbesitzer-ID", { status: 400 });
      }
      await updatePreviousOwner(token, ownerId, motorcycleId, ownerData);
    }

    return data({ success: true, intent: intent === "createPreviousOwner" ? "createPreviousOwner" : "updatePreviousOwner" });
  }

  if (intent === "setPreviousOwnersUnknown") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }
    const hasUnknownOwners = formData.get("hasUnknownOwners") === "true";
    await updateMotorcycleUnknownOwners(token, motorcycleId, hasUnknownOwners);
    return data({ success: true, intent: "setPreviousOwnersUnknown" });
  }

  if (intent === "deletePreviousOwner") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const ownerId = Number(formData.get("ownerId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(ownerId)) {
      throw new Response("Ungültige Eingabe für Vorbesitzer", { status: 400 });
    }

    await deletePreviousOwner(token, ownerId, motorcycleId);

    return data({ success: true, intent: "deletePreviousOwner" });
  }

  if (intent === "importFuelData") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Eingabe für Motorrad", { status: 400 });
    }

    const recordsJson = formData.get("records") as string;
    const records = JSON.parse(recordsJson) as any[];

    const { getLocations, getNearbyLocations } = await import("~/services/settings");
    const { normalizeLocationName } = await import("~/utils/geo");
    const { createReverseGeocoder } = await import("~/utils/reverse-geocode");
    const userLocations = await getLocations(token, user.id);
    const reverseGeocode = createReverseGeocoder();

    type KnownStation = { id: number; name: string; latitude: number | null; longitude: number | null };
    const knownFuelStations: KnownStation[] = userLocations
      .filter((l: any) => l.type === "fuelStation")
      .map((l: any) => ({
        id: l.id,
        name: l.name,
        latitude: l.latitude ?? null,
        longitude: l.longitude ?? null,
      }));

    const resolveLocationId = async (record: any): Promise<number | null> => {
      const hasCoords =
        typeof record.latitude === "number" && typeof record.longitude === "number";
      let rawName = typeof record.locationName === "string" ? record.locationName.trim() : "";
      let hasName = rawName.length > 0;

      if (hasCoords) {
        // Delegate coordinate matching to the backend (haversine, nearest-first)
        // — the same proximity endpoint the iOS app and the interactive near-me
        // flow use. On failure, fall through to name-based matching/creation
        // rather than dropping the record.
        try {
          const nearby = await getNearbyLocations(token, {
            lat: record.latitude,
            lon: record.longitude,
            radius: 100,
            type: "fuelStation",
          });
          if (nearby.length > 0) return nearby[0].id;
        } catch {
          // ignore — proceed to name fallback below
        }
      }

      // No usable name, but we do have coords — ask Nominatim for one so we
      // can still attach (or create) a fuel station instead of dropping the
      // location entirely.
      if (!hasName && hasCoords) {
        const reversed = await reverseGeocode(record.latitude, record.longitude);
        if (reversed) {
          rawName = reversed;
          hasName = true;
        }
      }

      if (hasName) {
        const target = normalizeLocationName(rawName);
        const match = knownFuelStations.find((l) => normalizeLocationName(l.name) === target);
        if (match) return match.id;
      }

      if (hasName) {
        const created = await createLocation(token, {
          name: rawName,
          type: "fuelStation",
          userId: user.id,
          latitude: hasCoords ? record.latitude : null,
          longitude: hasCoords ? record.longitude : null,
        });
        if (created && typeof created.id === "number") {
          knownFuelStations.push({
            id: created.id,
            name: created.name,
            latitude: created.latitude ?? null,
            longitude: created.longitude ?? null,
          });
          return created.id;
        }
      }

      return null;
    };

    if (records.length > 0) {
      try {
        // Send requests sequentially to avoid overwhelming the backend/proxy
        // and to let later records reuse locations created during this import.
        const { startPerfMark } = await import("~/components/umami-provider");
        const stopPerf = startPerfMark("fuel_import");
        for (const record of records) {
          const currency = record.currency || "CHF";
          const rate = record.currencyRate || getCurrencyFactor(currency);
          // eslint-disable-next-line no-await-in-loop
          const locationId = await resolveLocationId(record);
          const payload = {
            motorcycleId,
            type: "fuel" as const,
            date: record.date.split("T")[0],
            odo: record.odo,
            cost: record.cost,
            currency,
            fuelType: record.fuelType,
            fuelAmount: record.fuelAmount,
            pricePerUnit: record.pricePerUnit,
            normalizedCost: (record.cost || 0) * rate,
            locationId,
            description: null,
          };
          // eslint-disable-next-line no-await-in-loop
          await fetchFromBackend(`/motorcycles/${motorcycleId}/maintenance`, {
            method: "POST",
            body: JSON.stringify(payload),
          }, token);
        }
        stopPerf({ count: records.length, locations_known: knownFuelStations.length });
        return data({ success: true, intent: "importFuelData", count: records.length });
      } catch (e: any) {
        return data({ success: false, intent: "importFuelData", error: e.message || "Import fehlgeschlagen" }, { status: 500 });
      }
    }

    return data({ success: true, intent: "importFuelData", count: 0 });
  }

  return data({ success: false });
}

export default function MotorcycleDetail({ loaderData }: Route.ComponentProps) {
  const { trackEvent } = useUmami();
  const {
    motorcycle,
    openIssues,
    maintenanceHistory,
    motorcycleExpenses,
    totalLifetimeCost,
    previousOwnersList,
    ownerCount,
    nextInspection,
    lastKnownOdo,
    insights,
    userLocations,
    currentLocationName,
    currencies,
    modelSeries,
    parts,
    partConsumptions,
    ownershipLabel,
    kmDriven,
    avgKmPerYear,
    yearsOwned,
    avgFuelConsumption,
    avgTripDistance,
    estimatedRange,
    formattedPurchaseDate,
    formattedFirstRegistration,
    hasPurchaseDate
  } = loaderData;

  // Parts offered in the "Verwendete Teile" picker: positive on-hand, and —
  // when the bike has a catalog node — hierarchy-compatible with it (a part
  // linked to the Familie fits a bike on Serie/Modell level and vice versa;
  // parts without fitment stay offered so unassigned parts remain usable).
  const availableParts = parts.filter(
    (part) =>
      part.onHand > 0 &&
      (motorcycle.seriesId == null ||
        part.seriesIds.length === 0 ||
        seriesMatchesBike(part.seriesIds, motorcycle.seriesId, modelSeries)),
  );

  // "2× Ölfilter, 1× Dichtung" per maintenance record for the history list.
  const usedPartsByRecordId: Record<number, string> = {};
  for (const consumption of partConsumptions) {
    if (consumption.maintenanceRecordId == null) continue;
    const part = parts.find((candidate) => candidate.id === consumption.partId);
    const label = `${consumption.quantity}× ${part?.name ?? `Teil #${consumption.partId}`}`;
    usedPartsByRecordId[consumption.maintenanceRecordId] = usedPartsByRecordId[
      consumption.maintenanceRecordId
    ]
      ? `${usedPartsByRecordId[consumption.maintenanceRecordId]}, ${label}`
      : label;
  }

  const [editMotorcycleDialogOpen, setEditMotorcycleDialogOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteMaintenanceConfirmationOpen, setDeleteMaintenanceConfirmationOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[]>([]);
  const [bulkDeleteConfirmationOpen, setBulkDeleteConfirmationOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<(typeof maintenanceHistory)[number] | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [previousOwnersManageOpen, setPreviousOwnersManageOpen] = useState(false);
  const [previousOwnerDialogOpen, setPreviousOwnerDialogOpen] = useState(false);
  const [selectedPreviousOwner, setSelectedPreviousOwner] = useState<(typeof previousOwnersList)[number] | null>(null);
  const [deletePreviousOwnerConfirmationOpen, setDeletePreviousOwnerConfirmationOpen] = useState(false);
  const revalidator = useRevalidator();
  const actionData = useActionData<{ success?: boolean; error?: string; errors?: Record<string, string>; intent?: string; count?: number; failed?: number }>();
  const submit = useSubmit();
  const location = useLocation();
  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug ?? createMotorcycleSlug(motorcycle.make, motorcycle.model);
  const motorcycleIdParam = params.id ?? motorcycle.id.toString();
  const basePath = `/motorcycle/${slug}/${motorcycleIdParam}`;
  const navLinks = [
    { label: "Dokumente", to: `${basePath}/documents`, isActive: location.pathname.includes("/documents") },
    { label: "Werkstattdaten", to: `${basePath}/torque-specs`, isActive: location.pathname.includes("/torque-specs") },
    { label: "Teile", to: `${basePath}/parts`, isActive: location.pathname.includes("/parts") },
  ];
  const normalizePath = (path: string) => path.replace(/\/+$/, "");
  const overviewLink = {
    to: basePath,
    isActive: normalizePath(location.pathname) === normalizePath(basePath),
  };

  const lastHandledActionData = useRef<typeof actionData | null>(null);

  useEffect(() => {
    if (lastHandledActionData.current === actionData) return;
    lastHandledActionData.current = actionData;
    if (actionData?.success) {
      if (actionData.count !== undefined && actionData.intent === "importFuelData") {
        trackEvent("fuel_import_success", { count: actionData.count });
        toast.success("Tank-Daten importiert", `${actionData.count} Einträge übernommen.`);
      } else {
        switch (actionData.intent) {
          case "updateMotorcycle":
            toast.success("Motorrad aktualisiert");
            break;
          case "createIssue":
            toast.success("Mangel erstellt");
            break;
          case "updateIssue":
            toast.success("Mangel aktualisiert");
            break;
          case "deleteIssue":
            toast.success("Mangel gelöscht");
            break;
          case "createMaintenance":
            toast.success("Eintrag erstellt");
            break;
          case "updateMaintenance":
            toast.success("Eintrag aktualisiert");
            break;
          case "deleteMaintenance":
            toast.success("Eintrag gelöscht");
            break;
          case "deleteMaintenanceBulk":
            if (actionData.failed && actionData.failed > 0) {
              toast.success(
                `${actionData.count} Einträge gelöscht`,
                `${actionData.failed} konnten nicht gelöscht werden.`,
              );
            } else {
              toast.success(
                `${actionData.count} ${actionData.count === 1 ? "Eintrag" : "Einträge"} gelöscht`,
              );
            }
            break;
          case "createPreviousOwner":
            toast.success("Vorbesitzer erstellt");
            break;
          case "updatePreviousOwner":
            toast.success("Vorbesitzer aktualisiert");
            break;
          case "deletePreviousOwner":
            toast.success("Vorbesitzer gelöscht");
            break;
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditMotorcycleDialogOpen(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviousOwnerDialogOpen(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaintenanceDialogOpen(false);
      setSelectedPreviousOwner(null);
      revalidator.revalidate();
    } else if (actionData && actionData.success === false && actionData.error) {
      toast.error("Fehler", actionData.error);
    }
  }, [actionData, revalidator, trackEvent]);

  const openIssueDialog = (issue: Issue | null) => {
    setSelectedIssue(issue);
    setIssueDialogOpen(true);
  };

  const closeIssueDialog = () => {
    setIssueDialogOpen(false);
    setSelectedIssue(null);
  };

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 md:space-y-6">
      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        overviewLink={overviewLink}
        ownerCount={ownerCount}
      />

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3 items-start">
        <div className="min-w-0 space-y-5 sticky-tall">
          <MotorcycleInfoCard
            motorcycle={motorcycle}
            formattedFirstRegistration={formattedFirstRegistration}
            formattedPurchaseDate={formattedPurchaseDate}
            ownershipLabel={ownershipLabel}
            kmDriven={kmDriven}
            avgKmPerYear={avgKmPerYear ?? 0}
            yearsOwned={yearsOwned}
            hasPurchaseDate={hasPurchaseDate}
            avgFuelConsumption={avgFuelConsumption}
            avgTripDistance={avgTripDistance}
            estimatedRange={estimatedRange}
            totalLifetimeCost={totalLifetimeCost}
            onEdit={() => setEditMotorcycleDialogOpen(true)}
            onShowDetails={() => setInfoSheetOpen(true)}
            previousOwnersList={previousOwnersList}
            hasUnknownOwners={motorcycle.hasUnknownOwners}
            ownerCount={ownerCount}
          />
          <MaintenanceInsightsCard insights={insights} />
        </div>

        <div className="min-w-0 space-y-5 md:col-span-2">
          <OpenIssuesCard
            issues={openIssues}
            dateFormatter={dateFormatter}
            onAddIssue={() => openIssueDialog(null)}
            onIssueSelect={(issue) => openIssueDialog(issue)}
          />

          {/* Maintenance History Card */}
          <Card>
            <CardHeading
              title="Historie"
              meta={maintenanceHistory.length > 0 ? `${maintenanceHistory.length} ${maintenanceHistory.length === 1 ? "Eintrag" : "Einträge"}` : undefined}
              trailing={
                <CardAction
                  onClick={() => {
                    setSelectedMaintenance(null);
                    setMaintenanceDialogOpen(true);
                  }}
                  aria-label="Neuen Eintrag hinzufügen"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Neuer Eintrag
                </CardAction>
              }
            />
            <div className="px-4 py-4">
              <MaintenanceList
                records={maintenanceHistory}
                currencyCode={motorcycle.currencyCode}
                userLocations={userLocations}
                usedPartsByRecordId={usedPartsByRecordId}
                onEdit={(record) => {
                  setSelectedMaintenance(record);
                  setMaintenanceDialogOpen(true);
                }}
                onAdd={() => {
                  setSelectedMaintenance(null);
                  setMaintenanceDialogOpen(true);
                }}
                onBulkDelete={(ids) => {
                  if (ids.length === 0) return;
                  setBulkDeleteIds(ids);
                  setBulkDeleteConfirmationOpen(true);
                }}
              />
            </div>
          </Card>

          {/* Shared Expenses Card */}
          {motorcycleExpenses.length > 0 && (
            <Card>
              <CardHeading
                title="Gemeinsame Ausgaben"
                meta={`${motorcycleExpenses.length} ${motorcycleExpenses.length === 1 ? "Eintrag" : "Einträge"}`}
                trailing={<CardAction href="/fleet-expenses">Verwalten</CardAction>}
              />
              <div className="px-4 py-4">
                <ul className="space-y-2">
                  {motorcycleExpenses.map(expense => {
                    const factor = expense.motorcycleIds?.length || 1;
                    const proratedAmount = expense.amount / factor;
                    return (
                      <li
                        key={expense.id}
                        className="flex items-center justify-between gap-4 rounded-sm border border-base-200 bg-base-100 px-3 py-2.5 dark:border-navy-700 dark:bg-navy-900/40"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-subdisplay text-sm text-base-content dark:text-white">
                              {expense.category}
                            </span>
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/45">
                              {new Date(expense.date).toLocaleDateString("de-CH")}
                            </span>
                          </div>
                          {expense.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-base-content/65 dark:text-navy-400">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-numeric text-sm font-semibold text-base-content dark:text-white">
                            {formatCurrency(proratedAmount, expense.currency)}
                          </div>
                          {factor > 1 && (
                            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/45">
                              1/{factor} von {formatCurrency(expense.amount, expense.currency)}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={infoSheetOpen}
        onClose={() => setInfoSheetOpen(false)}
        title="Fahrzeugdaten"
        description={`${motorcycle.make} ${motorcycle.model}`}
      >
        <MotorcycleInfoCard
          variant="details"
          motorcycle={motorcycle}
          formattedFirstRegistration={formattedFirstRegistration}
          formattedPurchaseDate={formattedPurchaseDate}
          ownershipLabel={ownershipLabel}
          kmDriven={kmDriven}
          avgKmPerYear={avgKmPerYear ?? 0}
          yearsOwned={yearsOwned}
          hasPurchaseDate={hasPurchaseDate}
          avgFuelConsumption={avgFuelConsumption}
          avgTripDistance={avgTripDistance}
          estimatedRange={estimatedRange}
          totalLifetimeCost={totalLifetimeCost}
          onEdit={() => {
            setInfoSheetOpen(false);
            setEditMotorcycleDialogOpen(true);
          }}
          previousOwnersList={previousOwnersList}
          hasUnknownOwners={motorcycle.hasUnknownOwners}
          ownerCount={ownerCount}
        />
      </Modal>

      <Modal
        isOpen={editMotorcycleDialogOpen}
        onClose={() => setEditMotorcycleDialogOpen(false)}
        title="Motorrad bearbeiten"
        description="Passe die Fahrzeugdaten an."
      >
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-base-content/60">Lädt…</div>
          }
        >
          <AddMotorcycleForm
            initialValues={motorcycle}
            intent="updateMotorcycle"
            submitLabel="Speichern"
            onSubmit={() => setEditMotorcycleDialogOpen(false)}
            onDelete={() => setDeleteConfirmationOpen(true)}
            currencies={currencies}
            modelSeries={modelSeries}
            existingMaintenance={maintenanceHistory}
            previousOwnersCount={previousOwnersList.length}
            onManagePreviousOwners={() => setPreviousOwnersManageOpen(true)}
          />
        </Suspense>
      </Modal>

      <PreviousOwnersDialog
        isOpen={previousOwnersManageOpen}
        onClose={() => setPreviousOwnersManageOpen(false)}
        motorcycleId={motorcycle.id}
        owners={previousOwnersList}
        hasUnknownOwners={motorcycle.hasUnknownOwners}
        onAddOwner={() => {
          setSelectedPreviousOwner(null);
          setPreviousOwnerDialogOpen(true);
        }}
        onEditOwner={(owner) => {
          setSelectedPreviousOwner(owner);
          setPreviousOwnerDialogOpen(true);
        }}
      />

      <DeleteConfirmationDialog
        isOpen={deleteConfirmationOpen}
        onCancel={() => setDeleteConfirmationOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.append("intent", "deleteMotorcycle");
          formData.append("motorcycleId", motorcycle.id.toString());
          submit(formData, {
            method: "post",
          });
          setDeleteConfirmationOpen(false);
          setEditMotorcycleDialogOpen(false);
        }}
        title="Motorrad löschen"
        description="Bist du sicher, dass du dieses Motorrad löschen möchtest? Dies kann nicht rückgängig gemacht werden."
      />

      <MaintenanceDialog
        isOpen={maintenanceDialogOpen}
        onClose={() => setMaintenanceDialogOpen(false)}
        motorcycleId={motorcycle.id}
        initialData={selectedMaintenance}
        allRecords={maintenanceHistory}
        currencyCode={motorcycle.currencyCode}
        defaultOdo={lastKnownOdo}
        onDelete={() => {
          setMaintenanceDialogOpen(false);
          setDeleteMaintenanceConfirmationOpen(true);
        }}
        userLocations={userLocations}
        currencies={currencies}
        availableParts={availableParts}
        brakeConfig={{
          hasSidecar: Boolean(motorcycle.hasSidecar),
          front: motorcycle.frontBrakeType,
          rear: motorcycle.rearBrakeType,
          sidecar: motorcycle.sidecarBrakeType,
        }}
        driveType={motorcycle.driveType}
      />

      <DeleteConfirmationDialog
        isOpen={deleteMaintenanceConfirmationOpen}
        onCancel={() => {
          setDeleteMaintenanceConfirmationOpen(false);
          // Re-open maintenance dialog if cancelled? Or just close?
          // Usually just closing is fine, or re-opening. Let's just close for now.
          // If we want to re-open, we need to keep selectedMaintenance. We do keep it.
          setMaintenanceDialogOpen(true);
        }}
        onConfirm={() => {
          if (selectedMaintenance) {
            trackEvent("maintenance_delete", { type: selectedMaintenance.type });
            const formData = new FormData();
            formData.append("intent", "deleteMaintenance");
            formData.append("motorcycleId", motorcycle.id.toString());
            formData.append("maintenanceId", selectedMaintenance.id.toString());
            submit(formData, { method: "post" });
          }
          setDeleteMaintenanceConfirmationOpen(false);
          setSelectedMaintenance(null);
        }}
        title="Eintrag löschen"
        description="Möchtest du diesen Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        confirmDisabled={!selectedMaintenance}
      />

      <DeleteConfirmationDialog
        isOpen={bulkDeleteConfirmationOpen}
        onCancel={() => {
          setBulkDeleteConfirmationOpen(false);
          setBulkDeleteIds([]);
        }}
        onConfirm={() => {
          if (bulkDeleteIds.length > 0) {
            trackEvent("maintenance_delete_bulk", { count: bulkDeleteIds.length });
            const formData = new FormData();
            formData.append("intent", "deleteMaintenanceBulk");
            formData.append("motorcycleId", motorcycle.id.toString());
            for (const id of bulkDeleteIds) {
              formData.append("maintenanceIds[]", id.toString());
            }
            submit(formData, { method: "post" });
          }
          setBulkDeleteConfirmationOpen(false);
          setBulkDeleteIds([]);
        }}
        title={`${bulkDeleteIds.length} ${bulkDeleteIds.length === 1 ? "Eintrag" : "Einträge"} löschen`}
        description="Möchtest du die ausgewählten Einträge wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        confirmDisabled={bulkDeleteIds.length === 0}
      />
      <IssueDialog
        isOpen={issueDialogOpen}
        onClose={closeIssueDialog}
        motorcycleId={motorcycle.id}
        defaultOdo={lastKnownOdo}
        initialIssue={selectedIssue}
        onIssueSaved={() => {
          revalidator.revalidate();
          setSelectedIssue(null);
        }}
      />

      <PreviousOwnerDialog
        isOpen={previousOwnerDialogOpen}
        onClose={() => setPreviousOwnerDialogOpen(false)}
        motorcycleId={motorcycle.id}
        initialData={selectedPreviousOwner}
        onDelete={() => {
          setPreviousOwnerDialogOpen(false);
          setDeletePreviousOwnerConfirmationOpen(true);
        }}
        errors={actionData?.errors}
        onSubmit={() => setPreviousOwnerDialogOpen(false)}
      />

      <DeleteConfirmationDialog
        isOpen={deletePreviousOwnerConfirmationOpen}
        onCancel={() => {
          setDeletePreviousOwnerConfirmationOpen(false);
          setPreviousOwnerDialogOpen(true);
        }}
        onConfirm={() => {
          if (selectedPreviousOwner) {
            const formData = new FormData();
            formData.append("intent", "deletePreviousOwner");
            formData.append("motorcycleId", motorcycle.id.toString());
            formData.append("ownerId", selectedPreviousOwner.id.toString());
            submit(formData, { method: "post" });
          }
          setDeletePreviousOwnerConfirmationOpen(false);
          setSelectedPreviousOwner(null);
        }}
        title="Vorbesitzer löschen"
        description="Möchtest du diesen Vorbesitzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        confirmDisabled={!selectedPreviousOwner}
      />
    </div >
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
