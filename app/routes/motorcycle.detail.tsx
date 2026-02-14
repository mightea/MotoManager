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
import { getDb } from "~/db";
import { issues, maintenanceRecords, motorcycles, locations, type NewMaintenanceRecord, type MaintenanceType, type TirePosition, type BatteryType, type FluidType, type NewIssue, type Issue, type EditorMotorcycle } from "~/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import { ChevronDown, Plus, Hash, Calendar, DollarSign, Info, Gauge, Fingerprint, FileText } from "lucide-react";
import clsx from "clsx";
import OpenIssuesCard from "~/components/open-issues-card";
import { getNextInspectionInfo } from "~/utils/inspection";
import { MaintenanceList } from "~/components/maintenance-list";
import { MaintenanceDialog } from "~/components/maintenance-dialog";
import { IssueDialog } from "~/components/issue-dialog";
import { createIssue, createMaintenanceRecord, deleteIssue, updateIssue, updateMaintenanceRecord, createLocation, updateMotorcycle, deleteMotorcycleCascade } from "~/db/providers/motorcycles.server";
import { getMaintenanceInsights } from "~/utils/maintenance-intervals";
import { MaintenanceInsightsCard } from "~/components/maintenance-insights";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";
import { StatisticEntry } from "~/components/statistic-entry";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import sharp from "sharp";
import { motorcycleSchema } from "~/validations";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { formatCurrency } from "~/utils/numberUtils";

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

  const motorcycle = await db.query.motorcycles.findFirst({
    where: eq(motorcycles.id, motorcycleId),
  });

  if (!motorcycle) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  if (motorcycle.userId !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

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

  const insights = getMaintenanceInsights(maintenanceHistory, lastKnownOdo ?? 0);

  const userLocations = await db.query.locations.findMany({
    where: eq(locations.userId, user.id),
  });

  const currentLocationId = maintenanceHistory
    .filter(r => r.type === "location")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.locationId;

  const currentLocationName = userLocations.find(l => l.id === currentLocationId)?.name ?? null;

  return data(
    { motorcycle, user, openIssues, maintenanceHistory, nextInspection, lastKnownOdo, insights, userLocations, currentLocationName },
    { headers: mergeHeaders(headers ?? {}) }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const parseString = (value: FormDataEntryValue | null | undefined) =>
    typeof value === "string" && value.length > 0 ? value : undefined;

  const parseNumber = (value: FormDataEntryValue | null | undefined) => {
    const parsed = Number.parseFloat(typeof value === "string" ? value : "");
    return Number.isNaN(parsed) ? undefined : parsed;
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
      modelYear,
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
      const newFilename = `${uuidv4()}.webp`;
      const uploadPath = path.join(process.cwd(), "data", "images", newFilename);
      const buffer = Buffer.from(await imageEntry.arrayBuffer());
      await sharp(buffer).webp({ quality: 80 }).toFile(uploadPath);
      imagePath = `/data/images/${newFilename}`;
    }

    const updatedMotorcycle: EditorMotorcycle = {
      make,
      model,
      vin,
      vehicleIdNr: vehicleIdNr ?? null,
      numberPlate: numberPlate ?? null,
      firstRegistration: firstRegistration ?? null,
      initialOdo: initialOdo ?? 0,
      purchaseDate: purchaseDate ?? null,
      purchasePrice: purchasePrice ?? null,
      currencyCode: currencyCode ?? null,
      isVeteran: isVeteran,
      ...(imagePath ? { image: imagePath } : {}),
    };

    updatedMotorcycle.modelYear =
      typeof modelYear === "number" ? modelYear : null;

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
    let locationId: number | undefined = Number(formData.get("locationId"));
    if (Number.isNaN(locationId)) locationId = undefined;
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
    };

    if (intent === "createMaintenance") {
      await createMaintenanceRecord(dbClient, recordData as NewMaintenanceRecord);
    } else {
      const maintenanceId = Number(formData.get("maintenanceId"));
      await updateMaintenanceRecord(dbClient, maintenanceId, motorcycleId, recordData);
    }

    return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
  }

  return data({ success: false }, { headers: mergeHeaders(headers ?? {}) });
}

export default function MotorcycleDetail({ loaderData }: Route.ComponentProps) {
  const { motorcycle, openIssues, maintenanceHistory, nextInspection, lastKnownOdo, insights, userLocations, currentLocationName } = loaderData;
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editMotorcycleDialogOpen, setEditMotorcycleDialogOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<(typeof maintenanceHistory)[number] | null>(null);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const revalidator = useRevalidator();
  const actionData = useActionData<{ success?: boolean }>();
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







  // currencyFormatter removed







  return (



    <div className="container mx-auto max-w-7xl px-4 pb-24 pt-0 md:p-6 md:space-y-8 space-y-6">







      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        overviewLink={overviewLink}
      />

      <div className="grid gap-5 md:grid-cols-3 items-start">
        <div className="space-y-5 md:sticky md:top-6">
          {/* Basic Info Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
            <div className="mb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailsExpanded((prev) => !prev)}
                className="flex flex-1 items-center justify-between text-left text-base font-semibold text-foreground transition-colors hover:text-primary dark:text-white"
                aria-expanded={detailsExpanded}
              >
                <span>Fahrzeugdaten</span>
                <ChevronDown
                  className={clsx("h-5 w-5 transition-transform", {
                    "rotate-180": detailsExpanded,
                  })}
                />
              </button>
              <button
                type="button"
                onClick={() => setEditMotorcycleDialogOpen(true)}
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-secondary transition-colors hover:border-primary hover:text-primary dark:border-navy-600 dark:text-navy-200 dark:hover:border-primary-light dark:hover:text-primary-light"
              >
                Bearbeiten
              </button>
            </div>
            <div hidden={!detailsExpanded} className="mt-3 space-y-2">
              <StatisticEntry
                icon={Hash}
                label="Kennzeichen"
                value={motorcycle.numberPlate?.trim()}
              />
              <StatisticEntry
                icon={FileText}
                label="Stammnummer"
                value={motorcycle.vehicleIdNr?.trim()}
              />
              <StatisticEntry
                icon={Fingerprint}
                label="VIN"
                value={motorcycle.vin}
              />
              <StatisticEntry
                icon={Gauge}
                label="Anfangs-KM"
                value={motorcycle.initialOdo > 0 ? `${motorcycle.initialOdo} km` : null}
              />
              <StatisticEntry
                icon={Calendar}
                label="1. Inverkehrsetzung"
                value={
                  motorcycle.firstRegistration
                    ? dateFormatter.format(new Date(motorcycle.firstRegistration))
                    : null
                }
              />
              <StatisticEntry
                icon={Calendar}
                label="Kaufdatum"
                value={
                  motorcycle.purchaseDate
                    ? dateFormatter.format(new Date(motorcycle.purchaseDate))
                    : null
                }
              />
              <StatisticEntry
                icon={DollarSign}
                label="Kaufpreis"
                value={
                  motorcycle.purchasePrice !== null && motorcycle.purchasePrice !== undefined
                    ? formatCurrency(motorcycle.purchasePrice, motorcycle.currencyCode || undefined)
                    : null
                }
              />
              <StatisticEntry
                icon={Info}
                label="Status"
                value={
                  <span className="flex items-center gap-2">
                    {motorcycle.isArchived ? "Archiviert" : "Aktiv"}
                    {motorcycle.isVeteran && " • Veteran"}
                  </span>
                }
              />
            </div>
          </div>
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
        userLocations={userLocations}
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
    </div>
  );
}
