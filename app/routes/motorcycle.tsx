import type { Route } from "./+types/motorcycle";
import { getDb } from "~/db";
import {
  type EditorIssue,
  type EditorMotorcycle,
  type Issue,
  type MaintenanceRecord,
  type NewCurrentLocationRecord,
  type TorqueSpecification,
  motorcycles,
  maintenanceRecords,
  documentMotorcycles,
  documents,
  issues,
  locationRecords,
  locations,
  torqueSpecs,
} from "~/db/schema";
import {
  createIssue,
  createLocationRecord,
  updateIssue,
  deleteIssue,
  updateMotorcycle,
  deleteMotorcycleCascade,
} from "~/db/providers/motorcycles.server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import MotorcycleInfo from "~/components/motorcycle-info";
import { OpenIssuesCard } from "~/components/open-issues-card";
import { data, redirect, Outlet, useLocation, useNavigate } from "react-router";
import { parseIntSafe } from "~/utils/numberUtils";
import {
  MotorcycleProvider,
  type MotorcycleWithInspection,
} from "~/contexts/MotorcycleProvider";
import { type DocumentListItem } from "~/components/document-list";
import { MotorcycleDesktopTabs } from "~/components/motorcycle-desktop-tabs";
import { MotorcycleMobileTabs } from "~/components/motorcycle-mobile-tabs";
import { useMemo } from "react";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import type { TorqueImportCandidate } from "~/types/torque";

export interface MotorcycleOutletContext {
  motorcycle: MotorcycleWithInspection;
  maintenanceEntries: MaintenanceRecord[];
  issues: Issue[];
  currentOdo: number;
  torqueSpecifications: TorqueSpecification[];
  documents: DocumentListItem[];
  torqueImportCandidates: TorqueImportCandidate[];
}

type TabKey = "info" | "maintenance" | "torque" | "insights" | "documents";


const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const num = Number.parseFloat(String(value));
  return Number.isNaN(num) ? undefined : num;
};

const toOptionalInt = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const num = Number.parseInt(String(value), 10);
  return Number.isNaN(num) ? undefined : num;
};




const parseMotorcycleEditPayload = (
  fields: Record<string, FormDataEntryValue>,
) => {
  const make = toOptionalString(fields.make);
  const model = toOptionalString(fields.model);
  const vin = toOptionalString(fields.vin);
  const modelYear = toOptionalInt(fields.modelYear);
  const initialOdo = toOptionalInt(fields.initialOdo);
  const firstRegistration = toOptionalString(fields.firstRegistration);
  const purchaseDate = toOptionalString(fields.purchaseDate);
  const currencyCode = toOptionalString(fields.currencyCode);

  if (!make || !model || initialOdo == null) {
    throw new Error("Pflichtfelder wurden nicht ausgefüllt.");
  }

  const payload: EditorMotorcycle = {
    make,
    model,
    vin,
    modelYear,
    initialOdo,
    ...(firstRegistration ? { firstRegistration } : {}),
    ...(purchaseDate ? { purchaseDate } : {}),
    ...(currencyCode ? { currencyCode } : {}),
  };

  const numberPlate = toOptionalString(fields.numberPlate);
  if (numberPlate !== undefined) payload.numberPlate = numberPlate;

  const vehicleIdNr = toOptionalString(fields.vehicleIdNr);
  if (vehicleIdNr !== undefined) payload.vehicleIdNr = vehicleIdNr;

  const purchasePrice = toOptionalNumber(fields.purchasePrice);
  if (purchasePrice !== undefined) payload.purchasePrice = purchasePrice;

  const isVeteranValue = toOptionalString(fields.isVeteran);
  if (isVeteranValue !== undefined) {
    payload.isVeteran = isVeteranValue === "true" || isVeteranValue === "1";
  }

  const isArchivedValue = toOptionalString(fields.isArchived);
  if (isArchivedValue !== undefined) {
    payload.isArchived = isArchivedValue === "true" || isArchivedValue === "1";
  }

  return payload;
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const motorcycleId = Number.parseInt(params.motorcycleId ?? "", 10);

  if (isNaN(motorcycleId)) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  const result = await db.query.motorcycles.findFirst({
    where: and(
      eq(motorcycles.id, motorcycleId),
      eq(motorcycles.userId, user.id),
    ),
  });

  if (result === undefined) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  const maintenanceItems = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.motorcycleId, motorcycleId),
    orderBy: [
      desc(maintenanceRecords.date),
    ],
  });

  const issuesItems = await db.query.issues.findMany({
    where: eq(issues.motorcycleId, motorcycleId),
    orderBy: [
      asc(issues.date),
    ],
  });

  const locationHistory = await db
    .select({
      id: locationRecords.id,
      motorcycleId: locationRecords.motorcycleId,
      locationId: locationRecords.locationId,
      date: locationRecords.date,
      odometer: locationRecords.odometer,
      locationName: locations.name,
    })
    .from(locationRecords)
    .leftJoin(locations, eq(locationRecords.locationId, locations.id))
    .where(eq(locationRecords.motorcycleId, motorcycleId))
    .orderBy(desc(locationRecords.date), desc(locationRecords.id));

  const currentLocation = locationHistory.at(0) ?? null;

  const torqueSpecifications = await db.query.torqueSpecs.findMany({
    where: eq(torqueSpecs.motorcycleId, motorcycleId),
    orderBy: [asc(torqueSpecs.category), asc(torqueSpecs.name)],
  });

  const otherMotorcycles = (
    await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, user.id),
      orderBy: [asc(motorcycles.make), asc(motorcycles.model)],
    })
  ).filter((bike) => bike.id !== motorcycleId);

  let torqueImportCandidates: TorqueImportCandidate[] = [];

  if (otherMotorcycles.length > 0) {
    const candidateIds = otherMotorcycles.map((bike) => bike.id);
    const importSpecs = await db.query.torqueSpecs.findMany({
      where: inArray(torqueSpecs.motorcycleId, candidateIds),
      orderBy: [asc(torqueSpecs.category), asc(torqueSpecs.name)],
    });

    const specsByMotorcycle = new Map<number, TorqueSpecification[]>();
    importSpecs.forEach((spec) => {
      const bucket = specsByMotorcycle.get(spec.motorcycleId) ?? [];
      bucket.push(spec);
      specsByMotorcycle.set(spec.motorcycleId, bucket);
    });

    torqueImportCandidates = otherMotorcycles.map((bike) => {
      const specsForBike = specsByMotorcycle.get(bike.id) ?? [];
      return {
        id: bike.id,
        make: bike.make,
        model: bike.model,
        modelYear: bike.modelYear ?? null,
        numberPlate: bike.numberPlate ?? null,
        torqueSpecifications: [...specsForBike].sort((a, b) =>
          a.name.localeCompare(b.name, "de-CH"),
        ),
      };
    });
  }

  const documentRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      filePath: documents.filePath,
      previewPath: documents.previewPath,
      createdAt: documents.createdAt,
      uploadedBy: documents.uploadedBy,
      motorcycleId: documentMotorcycles.motorcycleId,
    })
    .from(documents)
    .leftJoin(
      documentMotorcycles,
      eq(documentMotorcycles.documentId, documents.id),
    );

  const documentsMap = new Map<
    number,
    {
      id: number;
      title: string;
      filePath: string;
      previewPath: string | null;
      createdAt: string;
      uploadedBy: string | null;
      motorcycleIds: number[];
    }
  >();

  documentRows.forEach((row) => {
    let entry = documentsMap.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        title: row.title,
        filePath: row.filePath,
        previewPath: row.previewPath ?? null,
        createdAt: row.createdAt,
        uploadedBy: row.uploadedBy ?? null,
        motorcycleIds: [],
      };
      documentsMap.set(row.id, entry);
    }
    if (row.motorcycleId !== undefined && row.motorcycleId !== null) {
      entry.motorcycleIds.push(row.motorcycleId);
    }
  });

  const documentSummaries: DocumentListItem[] = Array.from(
    documentsMap.values(),
  )
    .filter(
      (doc) =>
        doc.motorcycleIds.length === 0 ||
        doc.motorcycleIds.includes(motorcycleId),
    )
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      filePath: doc.filePath,
      previewPath: doc.previewPath,
      createdAt: doc.createdAt,
      uploadedBy: doc.uploadedBy,
    }));

  const lastInspectionFromMaintenance = maintenanceItems
    .filter((item) => item.type === "inspection" && item.date)
    .map((item) => item.date as string)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .at(0);

  const baseLastInspection = (result as { lastInspection?: string | null })
    .lastInspection;

  const enrichedMotorcycle: MotorcycleWithInspection = {
    ...result,
    lastInspection: lastInspectionFromMaintenance ?? baseLastInspection ?? null,
  };

  const odos = [
    enrichedMotorcycle.initialOdo,
    ...maintenanceItems.map((m) => m.odo),
    ...issuesItems.map((i) => i.odo),
    ...locationHistory
      .map((l) => l.odometer)
      .filter((o): o is number => o !== null),
  ];

  const currentOdo = odos.sort((a, b) => b - a).at(0);

  return data(
    {
      motorcycle: enrichedMotorcycle,
      maintenance: maintenanceItems,
      issues: issuesItems,
      currentOdo: currentOdo ?? enrichedMotorcycle.initialOdo,
      currentLocation: currentLocation ?? null,
      locationHistory,
      torqueSpecifications,
      torqueImportCandidates,
      documents: documentSummaries,
    },
    { headers: mergeHeaders(headers ?? {}) },
  );
}



export async function action({ request, params }: Route.ActionArgs) {
  const {
    getMotorcycleActionContext,
    parseIssuePayload,
  } = await import("./motorcycle.server");

  const context = await getMotorcycleActionContext({ request, params });
  if ("error" in context) {
    return context.error;
  }

  const { user, db, respond, motorcycleId, targetMotorcycle } = context;

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);

  const { intent } = fields;
  console.log("Action called with intent:", intent);
  console.log("Fields:", fields);

  if (intent === "issue-add") {
    try {
      const newIssue = parseIssuePayload(fields, motorcycleId);

      await createIssue(db, newIssue);
      return respond({ success: true }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Mangel konnte nicht gespeichert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "issue-edit") {
    const issueId = Number.parseInt((fields.issueId as string) ?? "", 10);
    if (Number.isNaN(issueId)) {
      return respond(
        {
          success: false,
          message: "Mangel konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    try {
      const issuePayload = parseIssuePayload(fields, motorcycleId);
      const {
        motorcycleId: ignoredIssueMotorcycleId,
        ...updatePayload
      } = issuePayload;
      void ignoredIssueMotorcycleId;

      console.log("Editing issue:", { issueId, updatePayload });

      const updatedIssue = await updateIssue(
        db,
        issueId,
        targetMotorcycle.id,
        updatePayload as EditorIssue,
      );

      if (!updatedIssue) {
        return respond(
          {
            success: false,
            message: "Mangel wurde nicht gefunden.",
          },
          { status: 404 },
        );
      }

      return respond({ success: true }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Mangel konnte nicht aktualisiert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "issue-delete") {
    console.log("Deleting issue with ID:", fields.issueId);
    const issueId = Number.parseInt(fields.issueId as string);

    if (Number.isNaN(issueId)) {
      return respond(
        { success: false, message: "Mangel konnte nicht ermittelt werden." },
        { status: 400 },
      );
    }

    const deleted = await deleteIssue(db, issueId, targetMotorcycle.id);
    if (!deleted) {
      return respond(
        { success: false, message: "Mangel wurde nicht gefunden." },
        { status: 404 },
      );
    }

    return respond({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-edit") {
    try {
      const payload = parseMotorcycleEditPayload(fields);

      const updatedMotorcycle = await updateMotorcycle(
        db,
        targetMotorcycle.id,
        user.id,
        payload,
      );

      if (!updatedMotorcycle) {
        return respond(
          {
            success: false,
            message: "Motorrad wurde nicht gefunden.",
          },
          { status: 404 },
        );
      }

      return respond({ success: true }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Motorrad konnte nicht aktualisiert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "motorcycle-delete") {
    await deleteMotorcycleCascade(db, targetMotorcycle.id);

    return redirect("/");
  }

  if (intent === "motorcycle-image") {
    const editMotorcycle: EditorMotorcycle = {
      image: fields.image as string,
    };

    await updateMotorcycle(db, targetMotorcycle.id, user.id, editMotorcycle);

    return respond({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-odo") {
    await updateMotorcycle(db, targetMotorcycle.id, user.id, {
      manualOdo: parseIntSafe(fields.manualOdo as string),
    });
    return respond(
      { success: true, intent: "motorcycle-odo" },
      { status: 200 },
    );
  }

  if (intent === "location-update") {
    console.log("Updating storage location to ID:", fields);

    const locationIdRaw =
      (fields.storageLocationId as string) ?? (fields.locationId as string);
    const locationId = Number.parseInt(locationIdRaw ?? "");

    if (Number.isNaN(locationId)) {
      return respond(
        { success: false, message: "Standort ist erforderlich." },
        { status: 400 },
      );
    }

    const selectedLocation = await db.query.locations.findFirst({
      where: and(eq(locations.id, locationId), eq(locations.userId, user.id)),
    });

    if (!selectedLocation) {
      return respond(
        { success: false, message: "Standort wurde nicht gefunden." },
        { status: 404 },
      );
    }

    const date = (fields.date as string) || undefined;
    const odometerRaw = fields.odometer as string | number | undefined;
    const parsedOdometer = Number.parseInt(odometerRaw?.toString() ?? "", 10);
    const odometer = Number.isNaN(parsedOdometer) ? null : parsedOdometer;

    const newLocationRecord: NewCurrentLocationRecord = {
      motorcycleId,
      locationId: selectedLocation.id,
      ...(date ? { date } : {}),
      ...(odometer !== null ? { odometer } : {}),
    };

    const insertedRecord = await createLocationRecord(db, newLocationRecord);
    if (!insertedRecord) {
      return respond(
        {
          success: false,
          message: "Standort konnte nicht gespeichert werden.",
        },
        { status: 500 },
      );
    }

    return respond(
      {
        success: true,
        intent: "location-update",
        location: {
          ...insertedRecord,
          odometer: insertedRecord.odometer ?? odometer ?? null,
          locationName: selectedLocation.name,
        },
      },
      { status: 200 },
    );
  }

  return respond(
    { success: false, message: `Unhandled intent ${intent}` },
    { status: 500 },
  );
}

export default function Motorcycle({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    maintenance: maintenanceEntries,
    issues,
    currentOdo,
    currentLocation,
    locationHistory,
    torqueSpecifications,
    torqueImportCandidates,
    documents,
  } = loaderData;
  const { make, model } = motorcycle;
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    const cleanPath = location.pathname.replace(/\/+$/, "");
    const segments = cleanPath.split("/");
    const lastSegment = segments.at(-1);
    const tabKey = (lastSegment ?? "").toLowerCase() as TabKey;
    return ["info", "maintenance", "torque", "insights", "documents"].includes(
      tabKey,
    )
      ? tabKey
      : "maintenance";
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    if (value === activeTab) return;
    switch (value as TabKey) {
      case "info":
        navigate("info");
        break;
      case "maintenance":
        navigate("maintenance");
        break;
      case "torque":
        navigate("torque");
        break;
      case "insights":
        navigate("insights");
        break;
      case "documents":
        navigate("documents");
        break;
      default:
        navigate("maintenance");
        break;
    }
  };

  const outletContext = useMemo(
    () => ({
      motorcycle,
      maintenanceEntries,
      issues,
      currentOdo,
      torqueSpecifications,
      torqueImportCandidates,
      documents,
    }),
    [
      motorcycle,
      maintenanceEntries,
      issues,
      currentOdo,
      torqueSpecifications,
      torqueImportCandidates,
      documents,
    ],
  );

  return (
    <MotorcycleProvider
      initialMotorcycle={motorcycle}
      initialCurrentLocation={currentLocation}
      initialCurrentOdo={currentOdo}
      initialLocationHistory={locationHistory}
    >
      <title>{`${make} ${model} - MotoManager`}</title>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="hidden space-y-8 lg:block lg:col-span-2 xl:col-span-2">
          <MotorcycleInfo />
          <OpenIssuesCard
            motorcycle={motorcycle}
            issues={issues}
            currentOdometer={currentOdo}
          />
        </div>
        <div className="lg:col-span-3 xl:col-span-3 space-y-6">
          <div className="lg:hidden">
            <MotorcycleMobileTabs
              maintenanceEntries={maintenanceEntries}
              documents={documents}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
          <div className="hidden lg:block">
            <MotorcycleDesktopTabs
              maintenanceEntries={maintenanceEntries}
              documents={documents}
              activeTab={activeTab === "info" ? "maintenance" : activeTab}
              onTabChange={handleTabChange}
            />
          </div>
          <div>
            <Outlet context={outletContext} />
          </div>
        </div>
      </div>
    </MotorcycleProvider>
  );
}
