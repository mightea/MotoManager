import { useState, useEffect } from "react";
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
import { type NewMaintenanceRecord, type MaintenanceType, type TirePosition, type BatteryType, type FluidType, type NewIssue, type Issue, type NewPreviousOwner } from "~/types/db";
import { requireUser } from "~/services/auth";
import { Plus } from "lucide-react";
import OpenIssuesCard from "~/components/open-issues-card";
import { MaintenanceList } from "~/components/maintenance-list";
import { MaintenanceDialog } from "~/components/maintenance-dialog";
import { IssueDialog } from "~/components/issue-dialog";
import { MaintenanceInsightsCard } from "~/components/maintenance-insights";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";
import { motorcycleSchema, previousOwnerSchema } from "~/validations";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { getCurrencies } from "~/services/settings";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { PreviousOwnerDialog } from "~/components/previous-owner-dialog";
import { MotorcycleInfoCard } from "~/components/motorcycle-info-card";
import { fetchFromBackend } from "~/utils/backend";

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

  const response = await fetchFromBackend<any>(`/motorcycles/${motorcycleId}`, {}, token);
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
  const settingsResponse = await fetchFromBackend<any>("/settings", {}, token);
  const settings = settingsResponse?.settings;
  const { getMaintenanceInsights } = await import("~/utils/maintenance-intervals");
  const insights = getMaintenanceInsights(maintenanceRecords, lastKnownOdo, settings);

  // Other metadata
  const { getLocations } = await import("~/services/settings");
  const userLocations = await getLocations(token, user.id);
  const currentLocationId = maintenanceRecords
    .filter((r: any) => r.type === "location")
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.locationId ?? null;
  const currentLocationName = userLocations.find((l: any) => l.id === currentLocationId)?.name ?? null;

  const currencies = await getCurrencies();

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

  const fuelStationNames = Array.from(new Set(
    maintenanceRecords
      .filter((r: any) => r.type === "fuel" && r.locationName)
      .map((r: any) => r.locationName)
  )) as string[];

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

  const { getNextInspectionInfo } = await import("~/utils/inspection");
  const nextInspection = getNextInspectionInfo({
    firstRegistration: motorcycle.firstRegistration,
    lastInspection,
    isVeteran: motorcycle.isVeteran ?? false,
  });

  return data(
    {
      motorcycle,
      openIssues,
      maintenanceHistory,
      previousOwnersList,
      ownerCount,
      nextInspection,
      lastKnownOdo,
      insights,
      userLocations,
      currentLocationName,
      currencies,
      ownershipLabel,
      kmDriven,
      avgKmPerYear,
      yearsOwned,
      avgFuelConsumption,
      avgTripDistance,
      estimatedRange,
      fuelStationNames,
      formattedPurchaseDate,
      formattedFirstRegistration,
      hasPurchaseDate,
      user,
    }
  );
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
    } = validationResult.data;

    const normalizedPurchasePrice = (purchasePrice || 0) * getCurrencyFactor(currencyCode);
    formData.set("normalizedPurchasePrice", normalizedPurchasePrice.toString());

    const updated = await updateMotorcycle(
      token,
      motorcycleId,
      user.id,
      formData,
    );

    if (!updated) {
      throw new Response("Motorrad nicht gefunden.", { status: 404 });
    }

    return data({ success: true });
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
    const description = parseString(formData.get("description"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(odo) || !description) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    const issueData: NewIssue = {
      motorcycleId,
      odo,
      description,
      priority: isValidPriority(formData.get("priority")),
      status: isValidStatus(formData.get("status")),
      date: parseString(formData.get("date")),
    };

    await createIssue(token, issueData);

    return data({ success: true });
  }

  if (intent === "updateIssue") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const issueId = Number(formData.get("issueId"));
    const odo = Number(formData.get("odo"));
    const description = parseString(formData.get("description"));

    if (
      !Number.isFinite(motorcycleId) ||
      !Number.isFinite(issueId) ||
      !Number.isFinite(odo) ||
      !description
    ) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    await updateIssue(token, issueId, motorcycleId, {
      odo,
      description,
      priority: isValidPriority(formData.get("priority")),
      status: isValidStatus(formData.get("status")),
      date: parseString(formData.get("date")),
    });

    return data({ success: true });
  }

  if (intent === "deleteIssue") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const issueId = Number(formData.get("issueId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(issueId)) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    await deleteIssue(token, issueId, motorcycleId);

    return data({ success: true });
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

    if (type === "location" && newLocationName) {
      const newLoc = await createLocation(token, {
        name: newLocationName,
        userId: user.id
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
      inspectionLocation: parseString(formData.get("inspectionLocation")),
      locationId: locationId,
      fuelType: parseString(formData.get("fuelType")),
      fuelAmount: parseNumber(formData.get("fuelAmount")),
      pricePerUnit: parseNumber(formData.get("pricePerUnit")),
      latitude: parseNumber(formData.get("latitude")),
      longitude: parseNumber(formData.get("longitude")),
      locationName: parseString(formData.get("locationName")),
      normalizedCost: (parseNumber(formData.get("cost")) || 0) * getCurrencyFactor(parseString(formData.get("currency"))),
    };

    if (intent === "createMaintenance") {
      await createMaintenanceRecord(token, recordData as NewMaintenanceRecord);
    } else {
      const maintenanceId = Number(formData.get("maintenanceId"));
      await updateMaintenanceRecord(token, maintenanceId, motorcycleId, recordData);
    }

    return data({ success: true });
  }

  if (intent === "deleteMaintenance") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const maintenanceId = Number(formData.get("maintenanceId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(maintenanceId)) {
      throw new Response("Ungültige Fahrzeug- oder Wartungs-ID", { status: 400 });
    }

    await deleteMaintenanceRecord(token, maintenanceId, motorcycleId);

    return data({ success: true });
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

    return data({ success: true });
  }

  if (intent === "deletePreviousOwner") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const ownerId = Number(formData.get("ownerId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(ownerId)) {
      throw new Response("Ungültige Eingabe für Vorbesitzer", { status: 400 });
    }

    await deletePreviousOwner(token, ownerId, motorcycleId);

    return data({ success: true });
  }

  if (intent === "importFuelData") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Eingabe für Motorrad", { status: 400 });
    }

    const recordsJson = formData.get("records") as string;
    const records = JSON.parse(recordsJson) as any[];

    const values = records.map(record => {
      const currency = record.currency || "CHF";
      const rate = record.currencyRate || getCurrencyFactor(currency);

      return {
        motorcycleId,
        type: "fuel" as const,
        date: record.date.split("T")[0],
        odo: record.odo,
        cost: record.cost,
        currency: currency,
        fuelType: record.fuelType,
        fuelAmount: record.fuelAmount,
        pricePerUnit: record.pricePerUnit,
        latitude: record.latitude,
        longitude: record.longitude,
        locationName: record.locationName,
        normalizedCost: (record.cost || 0) * rate,
        description: null
      };
    });

    if (values.length > 0) {
      await fetchFromBackend(`/motorcycles/${motorcycleId}/fuel-import`, {
        method: "POST",
        body: JSON.stringify({ records: values }),
      }, token);
    }

    return data({ success: true });
  }

  return data({ success: false });
}

export default function MotorcycleDetail({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    openIssues,
    maintenanceHistory,
    previousOwnersList,
    ownerCount,
    nextInspection,
    lastKnownOdo,
    insights,
    userLocations,
    currentLocationName,
    currencies,
    ownershipLabel,
    kmDriven,
    avgKmPerYear,
    yearsOwned,
    avgFuelConsumption,
    avgTripDistance,
    estimatedRange,
    fuelStationNames,
    formattedPurchaseDate,
    formattedFirstRegistration,
    hasPurchaseDate
  } = loaderData;
  const [editMotorcycleDialogOpen, setEditMotorcycleDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteMaintenanceConfirmationOpen, setDeleteMaintenanceConfirmationOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<(typeof maintenanceHistory)[number] | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [previousOwnerDialogOpen, setPreviousOwnerDialogOpen] = useState(false);
  const [selectedPreviousOwner, setSelectedPreviousOwner] = useState<(typeof previousOwnersList)[number] | null>(null);
  const [deletePreviousOwnerConfirmationOpen, setDeletePreviousOwnerConfirmationOpen] = useState(false);
  const revalidator = useRevalidator();
  const actionData = useActionData<{ success?: boolean; errors?: Record<string, string> }>();
  const submit = useSubmit();
  const location = useLocation();
  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug ?? createMotorcycleSlug(motorcycle.make, motorcycle.model);
  const motorcycleIdParam = params.id ?? motorcycle.id.toString();
  const basePath = `/motorcycle/${slug}/${motorcycleIdParam}`;
  const navLinks = [
    { label: "Dokumente", to: `${basePath}/documents`, isActive: location.pathname.includes("/documents") },
    { label: "Anzugsmomente", to: `${basePath}/torque-specs`, isActive: location.pathname.includes("/torque-specs") },
  ];
  const normalizePath = (path: string) => path.replace(/\/+$/, "");
  const overviewLink = {
    to: basePath,
    isActive: normalizePath(location.pathname) === normalizePath(basePath),
  };

  useEffect(() => {
    if (actionData?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditMotorcycleDialogOpen(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviousOwnerDialogOpen(false);
      setSelectedPreviousOwner(null);
      revalidator.revalidate();
    }
  }, [actionData, revalidator]);

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
    <div className="container mx-auto max-w-7xl px-4 pb-24 pt-0 md:p-6 md:space-y-8 space-y-6">
      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        overviewLink={overviewLink}
        ownerCount={ownerCount}
      />

      <div className="grid gap-5 md:grid-cols-3 items-start">
        <div className="space-y-5 md:sticky" style={{ top: "calc(var(--app-header-offset, 0px) + 1.5rem)" }}>
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
            onEdit={() => setEditMotorcycleDialogOpen(true)}
            previousOwnersList={previousOwnersList}
            onAddPreviousOwner={() => {
              setSelectedPreviousOwner(null);
              setPreviousOwnerDialogOpen(true);
            }}
            onEditPreviousOwner={(owner) => {
              setSelectedPreviousOwner(owner);
              setPreviousOwnerDialogOpen(true);
            }}
            ownerCount={ownerCount}
          />
          <MaintenanceInsightsCard insights={insights} />
          <OpenIssuesCard
            issues={openIssues}
            dateFormatter={dateFormatter}
            onAddIssue={() => openIssueDialog(null)}
            onIssueSelect={(issue) => openIssueDialog(issue)}
          />
        </div>

        <div className="space-y-5 md:col-span-2">
          {/* Maintenance History Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-700 dark:bg-navy-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-navy-700">
              <h2 className="text-sm font-semibold text-foreground dark:text-white">Historie</h2>
              <button
                onClick={() => {
                  setSelectedMaintenance(null);
                  setMaintenanceDialogOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-navy-700 dark:text-primary-light dark:hover:bg-navy-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Eintrag
              </button>
            </div>
            <MaintenanceList
              records={maintenanceHistory}
              currencyCode={motorcycle.currencyCode}
              userLocations={userLocations}
              onEdit={(record) => {
                setSelectedMaintenance(record);
                setMaintenanceDialogOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={editMotorcycleDialogOpen}
        onClose={() => setEditMotorcycleDialogOpen(false)}
        title="Motorrad bearbeiten"
        description="Passe die Fahrzeugdaten an."
      >
        <AddMotorcycleForm
          initialValues={motorcycle}
          intent="updateMotorcycle"
          submitLabel="Speichern"
          onSubmit={() => setEditMotorcycleDialogOpen(false)}
          onDelete={() => setDeleteConfirmationOpen(true)}
          currencies={currencies}
          existingMaintenance={maintenanceHistory}
        />
      </Modal>

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
        currencyCode={motorcycle.currencyCode}
        defaultOdo={lastKnownOdo}
        onDelete={() => {
          setMaintenanceDialogOpen(false);
          setDeleteMaintenanceConfirmationOpen(true);
        }}
        userLocations={userLocations}
        locationNames={fuelStationNames}
        currencies={currencies}
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
