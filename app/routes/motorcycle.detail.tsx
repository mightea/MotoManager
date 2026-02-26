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
import { getCachedData } from "~/utils/offline-cache.client";
import { getDb } from "~/db";
import { issues, maintenanceRecords, motorcycles, locations, previousOwners, type NewMaintenanceRecord, type MaintenanceType, type TirePosition, type BatteryType, type FluidType, type NewIssue, type Issue, type EditorMotorcycle, type NewPreviousOwner } from "~/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import { Plus } from "lucide-react";
import OpenIssuesCard from "~/components/open-issues-card";
import { getNextInspectionInfo, formatDuration, parseDate } from "~/utils/inspection";
import { getUserSettings } from "~/db/providers/settings.server";
import { MaintenanceList } from "~/components/maintenance-list";
import { MaintenanceDialog } from "~/components/maintenance-dialog";
import { IssueDialog } from "~/components/issue-dialog";
import { getMaintenanceInsights } from "~/utils/maintenance-intervals";
import { MaintenanceInsightsCard } from "~/components/maintenance-insights";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";
import { motorcycleSchema, previousOwnerSchema } from "~/validations";
import { processImageUpload } from "~/services/images.server";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { PreviousOwnerDialog } from "~/components/previous-owner-dialog";
import { MotorcycleInfoCard } from "~/components/motorcycle-info-card";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.motorcycle) {
    return [{ title: "Fahrzeug nicht gefunden - Moto Manager" }];
  }
  const { make, model } = data.motorcycle;
  return [
    { title: `${make} ${model} - Moto Manager` },
    { name: "description", content: `Details, Wartungshistorie und Mängel für ${make} ${model}.` },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = parseInt(params.id, 10);

  if (isNaN(motorcycleId)) {
    throw new Response("Invalid Motorcycle ID", { status: 400 });
  }

  const [motorcycle, settings, previousOwnersList] = await Promise.all([
    db.query.motorcycles.findFirst({
      where: eq(motorcycles.id, motorcycleId),
    }),
    getUserSettings(db, user.id),
    db.select().from(previousOwners).where(eq(previousOwners.motorcycleId, motorcycleId)).orderBy(desc(previousOwners.purchaseDate)),
  ]);

  if (!motorcycle) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  if (motorcycle.userId !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const ownerCount = (previousOwnersList?.length ?? 0) > 0
    ? (previousOwnersList?.length ?? 0) + 1
    : (motorcycle.initialOdo < 100 ? 1 : 0);

  const openIssues = await db.query.issues.findMany({
    where: and(eq(issues.motorcycleId, motorcycleId), ne(issues.status, "done")),
    orderBy: [desc(issues.priority), desc(issues.date)],
  });

  const maintenanceHistory = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.motorcycleId, motorcycleId),
    orderBy: [desc(maintenanceRecords.date)],
  });

  const lastKnownOdo = [
    motorcycle.manualOdo ?? undefined,
    motorcycle.initialOdo ?? undefined,
    ...maintenanceHistory.map((record) => record.odo),
    ...openIssues.map((issue) => issue.odo),
  ].reduce<number | null>((max, value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return max;
    }
    if (max === null) {
      return value;
    }
    return value > max ? value : max;
  }, null);

  const lastInspection = maintenanceHistory
    .filter((entry) => entry.type === "inspection" && entry.date)
    .map((entry) => entry.date as string)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .at(0) ?? null;

  const nextInspection = getNextInspectionInfo({
    firstRegistration: motorcycle.firstRegistration,
    lastInspection,
    isVeteran: motorcycle.isVeteran ?? false,
  });

  const insights = getMaintenanceInsights(maintenanceHistory, lastKnownOdo ?? 0, settings);

  const userLocations = await db.query.locations.findMany({
    where: eq(locations.userId, user.id),
  });

  const currentLocationId = maintenanceHistory
    .filter(r => r.type === "location")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.locationId;

  const currentLocationName = userLocations.find(l => l.id === currentLocationId)?.name ?? null;

  const currencies = await db.query.currencySettings.findMany();

  // Ownership Calculations
  const purchaseDate = parseDate(motorcycle.purchaseDate);
  const daysOwned = purchaseDate
    ? Math.max(0, Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const yearsOwned = daysOwned / 365.25;

  const currentOdo = lastKnownOdo ?? motorcycle.initialOdo;
  const kmDriven = Math.max(0, currentOdo - motorcycle.initialOdo);
  const avgKmPerYear = yearsOwned > 0.1 ? kmDriven / yearsOwned : 0;

  const ownershipDuration = purchaseDate ? formatDuration(daysOwned) : null;
  const ownershipLabel = ownershipDuration ? `${ownershipDuration.value} ${ownershipDuration.unit}` : null;

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  const firstRegistrationDate = parseDate(motorcycle.firstRegistration);

  return data(
    {
      motorcycle,
      user,
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
      formattedPurchaseDate: purchaseDate ? dateFormatter.format(purchaseDate) : null,
      formattedFirstRegistration: firstRegistrationDate ? dateFormatter.format(firstRegistrationDate) : null,
      hasPurchaseDate: !!purchaseDate
    },
    { headers: mergeHeaders(headers ?? {}) }
  );
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  return getCachedData(request, serverLoader);
}

clientLoader.hydrate = true;

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
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

  const dbClient = await getDb();
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
    deletePreviousOwner
  } = await import("~/db/providers/motorcycles.server");

  // Fetch currencies for normalization
  const currencies = await dbClient.query.currencySettings.findMany();
  const getCurrencyFactor = (code: string | null | undefined) => {
    if (!code) return 1;
    const currency = currencies.find(c => c.code === code);
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
      return data({ errors: formattedErrors }, { status: 400, headers: mergeHeaders(headers ?? {}) });
    }

    const {
      make,
      model,
      vin,
      engineNumber,
      fabricationDate,
      vehicleIdNr,
      numberPlate, // Not in EditorMotorcycle? Wait, let's check schema. EditorMotorcycle usually has similar fields.
      firstRegistration,
      initialOdo,
      purchaseDate,
      purchasePrice,
      currencyCode,
      isVeteran,
      // isArchived is not usually editable here or maybe it is? The form doesn't show it but schema might support it.
    } = validationResult.data;

    const imageEntry = formData.get("image");
    let imagePath: string | undefined = undefined;

    if (imageEntry && imageEntry instanceof File && imageEntry.size > 0) {
      imagePath = await processImageUpload(imageEntry);
    }

    const updatedMotorcycle: EditorMotorcycle = {
      make,
      model,
      vin,
      engineNumber: engineNumber ?? null,
      fabricationDate,
      vehicleIdNr: vehicleIdNr ?? null,
      numberPlate: numberPlate ?? null,
      firstRegistration: firstRegistration ?? null,
      initialOdo: initialOdo ?? 0,
      purchaseDate: purchaseDate ?? null,
      purchasePrice: purchasePrice ?? null,
      currencyCode: currencyCode ?? null,
      isVeteran: isVeteran,
      ...(imagePath ? { image: imagePath } : {}),
      normalizedPurchasePrice: (purchasePrice || 0) * getCurrencyFactor(currencyCode),
    };

    const updated = await updateMotorcycle(
      dbClient,
      motorcycleId,
      user.id,
      updatedMotorcycle,
    );

    if (!updated) {
      throw new Response("Motorrad nicht gefunden.", { status: 404 });
    }

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  if (intent === "deleteMotorcycle") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }

    const motorcycleRecord = await dbClient.query.motorcycles.findFirst({
      where: eq(motorcycles.id, motorcycleId),
    });

    if (!motorcycleRecord || motorcycleRecord.userId !== user.id) {
      throw new Response("Motorrad nicht gefunden.", { status: 404 });
    }

    await deleteMotorcycleCascade(dbClient, motorcycleId);

    const response = redirect("/");
    mergeHeaders(headers ?? {}).forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
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

    await createIssue(dbClient, issueData);

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
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

    await updateIssue(dbClient, issueId, motorcycleId, {
      odo,
      description,
      priority: isValidPriority(formData.get("priority")),
      status: isValidStatus(formData.get("status")),
      date: parseString(formData.get("date")),
    });

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  if (intent === "deleteIssue") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const issueId = Number(formData.get("issueId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(issueId)) {
      throw new Response("Ungültige Eingabe für den Mangel", { status: 400 });
    }

    await deleteIssue(dbClient, issueId, motorcycleId);

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
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
      const newLoc = await createLocation(dbClient, {
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
      normalizedCost: (parseNumber(formData.get("cost")) || 0) * getCurrencyFactor(parseString(formData.get("currency"))),
    };

    if (intent === "createMaintenance") {
      await createMaintenanceRecord(dbClient, recordData as NewMaintenanceRecord);
    } else {
      const maintenanceId = Number(formData.get("maintenanceId"));
      await updateMaintenanceRecord(dbClient, maintenanceId, motorcycleId, recordData);
    }

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  if (intent === "deleteMaintenance") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const maintenanceId = Number(formData.get("maintenanceId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(maintenanceId)) {
      throw new Response("Ungültige Fahrzeug- oder Wartungs-ID", { status: 400 });
    }

    await deleteMaintenanceRecord(dbClient, maintenanceId, motorcycleId);

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  if (intent === "createPreviousOwner" || intent === "updatePreviousOwner") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    if (!Number.isFinite(motorcycleId)) {
      throw new Response("Ungültige Fahrzeug-ID", { status: 400 });
    }

    const motorcycleRecord = await dbClient.query.motorcycles.findFirst({
      where: eq(motorcycles.id, motorcycleId),
    });

    if (!motorcycleRecord || motorcycleRecord.userId !== user.id) {
      throw new Response("Motorrad nicht gefunden.", { status: 404 });
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
      return data({ errors: formattedErrors }, { status: 400, headers: mergeHeaders(headers ?? {}) });
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
      await createPreviousOwner(dbClient, ownerData);
    } else {
      const ownerId = Number(formData.get("ownerId"));
      if (!Number.isFinite(ownerId)) {
        throw new Response("Ungültige Vorbesitzer-ID", { status: 400 });
      }
      await updatePreviousOwner(dbClient, ownerId, motorcycleId, ownerData);
    }

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  if (intent === "deletePreviousOwner") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const ownerId = Number(formData.get("ownerId"));

    if (!Number.isFinite(motorcycleId) || !Number.isFinite(ownerId)) {
      throw new Response("Ungültige Eingabe für Vorbesitzer", { status: 400 });
    }

    const motorcycleRecord = await dbClient.query.motorcycles.findFirst({
      where: eq(motorcycles.id, motorcycleId),
    });

    if (!motorcycleRecord || motorcycleRecord.userId !== user.id) {
      throw new Response("Motorrad nicht gefunden.", { status: 404 });
    }

    await deletePreviousOwner(dbClient, ownerId, motorcycleId);

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  return data({ success: false }, { headers: mergeHeaders(headers ?? {}) });
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
    }
  }, [actionData]);

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
        <div className="space-y-5 md:sticky md:top-6">
          <MotorcycleInfoCard
            motorcycle={motorcycle}
            formattedFirstRegistration={formattedFirstRegistration}
            formattedPurchaseDate={formattedPurchaseDate}
            ownershipLabel={ownershipLabel}
            kmDriven={kmDriven}
            avgKmPerYear={avgKmPerYear}
            yearsOwned={yearsOwned}
            hasPurchaseDate={hasPurchaseDate}
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
          <div className="hidden md:block">
            <MaintenanceInsightsCard insights={insights} />
          </div>
        </div>

        <div className="space-y-5 md:col-span-2">
          <OpenIssuesCard
            issues={openIssues}
            dateFormatter={dateFormatter}
            onAddIssue={() => openIssueDialog(null)}
            onIssueSelect={(issue) => openIssueDialog(issue)}
          />

          {/* Maintenance History Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground dark:text-white">Wartungshistorie</h2>
              <button
                onClick={() => {
                  setSelectedMaintenance(null);
                  setMaintenanceDialogOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 dark:bg-navy-700 dark:text-primary-light dark:hover:bg-navy-600"
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

      <div className="md:hidden">
        <MaintenanceInsightsCard insights={insights} />
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
        description="Möchtest du diesen Wartungseintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
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
