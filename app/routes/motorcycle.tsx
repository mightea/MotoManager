import type { Route } from "./+types/motorcycle";
import { getDb } from "~/db";
import {
  type BatteryType,
  type EditorIssue,
  type EditorMotorcycle,
  type FluidType,
  type Issue,
  type MaintenanceType,
  type NewIssue,
  type NewMaintenanceRecord,
  type NewTorqueSpecification,
  type NewCurrentLocationRecord,
  type OilType,
  type TirePosition,
  motorcycles,
  maintenanceRecords,
  documentMotorcycles,
  documents,
  issues,
  locationRecords,
  locations,
  torqueSpecs,
} from "~/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import MotorcycleInfo from "~/components/motorcycle-info";
import { OpenIssuesCard } from "~/components/open-issues-card";
import { data, redirect } from "react-router";
import { parseIntSafe } from "~/utils/numberUtils";
import {
  MotorcycleProvider,
  type MotorcycleWithInspection,
} from "~/contexts/MotorcycleProvider";
import { type DocumentListItem } from "~/components/document-list";
import { MotorcycleDesktopTabs } from "~/components/motorcycle-desktop-tabs";
import { MotorcycleMobileTabs } from "~/components/motorcycle-mobile-tabs";
import { useState } from "react";
import { mergeHeaders, requireUser } from "~/services/auth.server";

const MAINTENANCE_TYPES: readonly MaintenanceType[] = [
  "tire",
  "battery",
  "brakepad",
  "chain",
  "brakerotor",
  "fluid",
  "general",
  "repair",
  "service",
  "inspection",
] as const;

const FLUID_TYPES: readonly FluidType[] = [
  "engineoil",
  "gearboxoil",
  "finaldriveoil",
  "driveshaftoil",
  "forkoil",
  "breakfluid",
  "coolant",
];

const BATTERY_TYPES: readonly BatteryType[] = [
  "lead-acid",
  "gel",
  "agm",
  "lithium-ion",
  "other",
];

const TIRE_POSITIONS: readonly TirePosition[] = [
  "front",
  "rear",
  "sidecar",
];

const OIL_TYPES: readonly OilType[] = [
  "synthetic",
  "semi-synthetic",
  "mineral",
];

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

const toEnumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined => {
  const str = toOptionalString(value);
  if (!str) return undefined;
  return allowed.includes(str as T) ? (str as T) : undefined;
};

const parseMaintenancePayload = (
  fields: Record<string, FormDataEntryValue>,
  motorcycleId: number,
) => {
  const date = toOptionalString(fields.date);
  if (!date) {
    throw new Error("Datum ist erforderlich.");
  }

  const type = toEnumValue(fields.type, MAINTENANCE_TYPES);
  if (!type) {
    throw new Error("Ungültiger Wartungstyp.");
  }

  const odo = toOptionalInt(fields.odo);
  if (odo == null || odo < 0) {
    throw new Error("Kilometerstand ist erforderlich und muss positiv sein.");
  }

  const cost = toOptionalNumber(fields.cost);
  const currency =
    toOptionalString(fields.currency) ?? toOptionalString(fields.currencyCode);

  const payload: NewMaintenanceRecord = {
    motorcycleId,
    date,
    type,
    odo,
    ...(cost !== undefined ? { cost } : {}),
    ...(currency ? { currency } : {}),
  };

  const description = toOptionalString(fields.description);
  if (description !== undefined) payload.description = description;

  const brand = toOptionalString(fields.brand);
  if (brand !== undefined) payload.brand = brand;

  const model = toOptionalString(fields.model);
  if (model !== undefined) payload.model = model;

  const tirePosition = toEnumValue(fields.tirePosition, TIRE_POSITIONS);
  if (tirePosition !== undefined) payload.tirePosition = tirePosition;

  const tireSize = toOptionalString(fields.tireSize);
  if (tireSize !== undefined) payload.tireSize = tireSize;

  const dotCode = toOptionalString(fields.dotCode);
  if (dotCode !== undefined) payload.dotCode = dotCode;

  const batteryType = toEnumValue(fields.batteryType, BATTERY_TYPES);
  if (batteryType !== undefined) payload.batteryType = batteryType;

  const fluidType = toEnumValue(fields.fluidType, FLUID_TYPES);
  if (fluidType !== undefined) payload.fluidType = fluidType;

  const viscosity = toOptionalString(fields.viscosity);
  if (viscosity !== undefined) payload.viscosity = viscosity;

  const oilType = toEnumValue(fields.oilType, OIL_TYPES);
  if (oilType !== undefined) payload.oilType = oilType;

  const inspectionLocation = toOptionalString(fields.inspectionLocation);
  if (inspectionLocation !== undefined)
    payload.inspectionLocation = inspectionLocation;

  return payload;
};

const ISSUE_PRIORITIES = ["low", "medium", "high"] as const satisfies readonly Issue["priority"][];
const ISSUE_STATUSES = ["new", "in_progress", "done"] as const satisfies readonly Issue["status"][];

const parseIssuePayload = (
  fields: Record<string, FormDataEntryValue>,
  motorcycleId: number,
) => {
  const description = toOptionalString(fields.description);
  if (!description) {
    throw new Error("Beschreibung ist erforderlich.");
  }

  const priority = toEnumValue(fields.priority, ISSUE_PRIORITIES);
  if (!priority) {
    throw new Error("Priorität ist ungültig.");
  }

  const status = toEnumValue(fields.status, ISSUE_STATUSES);
  if (!status) {
    throw new Error("Status ist ungültig.");
  }

  const date = toOptionalString(fields.date);
  if (!date) {
    throw new Error("Datum ist erforderlich.");
  }

  const odo = toOptionalInt(fields.odo);
  if (odo == null || odo < 0) {
    throw new Error("Kilometerstand ist erforderlich und muss positiv sein.");
  }

  return {
    motorcycleId,
    description,
    priority,
    status,
    date,
    odo,
  } satisfies NewIssue;
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

    if (!make || !model || !vin || modelYear == null || initialOdo == null) {
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
      payload.isArchived =
        isArchivedValue === "true" || isArchivedValue === "1";
    }

    return payload;
};

const parseTorquePayload = (
  fields: Record<string, FormDataEntryValue>,
  motorcycleId: number,
) => {
  const category = toOptionalString(fields.category);
  const name = toOptionalString(fields.name);
  if (!category || !name) {
    throw new Error("Kategorie und Bezeichnung sind erforderlich.");
  }

  const torque = toOptionalNumber(fields.torque);
  if (torque == null) {
    throw new Error("Drehmoment ist ungültig.");
  }

  const variation = toOptionalNumber(fields.variation);
  const description =
    toOptionalString(fields.description) ?? (fields.description === null ? null : undefined);

  return {
    motorcycleId,
    category,
    name,
    torque,
    ...(variation !== undefined ? { variation } : {}),
    ...(description !== undefined ? { description } : {}),
  } satisfies NewTorqueSpecification;
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
      desc(maintenanceRecords.date), // Order by date descending
    ],
  });

  const issuesItems = await db.query.issues.findMany({
    where: eq(issues.motorcycleId, motorcycleId),
    orderBy: [
      asc(issues.date), // Order by dateAdded descending
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
    lastInspection:
      lastInspectionFromMaintenance ?? baseLastInspection ?? null,
  };

  // Get all odometer readings from all items
  const odos = [
    enrichedMotorcycle.initialOdo,
    ...maintenanceItems.map((m) => m.odo),
    ...issuesItems.map((i) => i.odo),
    ...locationHistory
      .map((l) => l.odometer)
      .filter((o): o is number => o !== null),
  ];

  // Get the current odometer reading, which is the highest value
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
      documents: documentSummaries,
    },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { user, headers: sessionHeaders } = await requireUser(request);
  const db = await getDb();

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);

  const respond = (body: unknown, init?: ResponseInit) =>
    data(body, {
      ...init,
      headers: mergeHeaders(sessionHeaders ?? {}),
    });

  const { intent } = fields;
  console.log("Action called with intent:", intent);
  console.log("Fields:", fields);

  const motorcycleId = Number.parseInt(params.motorcycleId ?? "", 10);
  if (Number.isNaN(motorcycleId)) {
    return respond(
      { success: false, message: "Motorrad konnte nicht ermittelt werden." },
      { status: 400 },
    );
  }

  const targetMotorcycle = await db.query.motorcycles.findFirst({
    where: and(
      eq(motorcycles.id, motorcycleId),
      eq(motorcycles.userId, user.id),
    ),
  });

  if (!targetMotorcycle) {
    return respond(
      { success: false, message: "Motorrad wurde nicht gefunden." },
      { status: 404 },
    );
  }

  if (intent === "issue-add") {
    try {
      const newIssue = parseIssuePayload(fields, motorcycleId);

      console.log("Adding new issue:", newIssue);

      await db.insert(issues).values(newIssue);
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
      const { motorcycleId: _ignore, ...updatePayload } = issuePayload;

      console.log("Editing issue:", { issueId, updatePayload });

      const result = await db
        .update(issues)
        .set(updatePayload as EditorIssue)
        .where(
          and(
            eq(issues.id, issueId),
            eq(issues.motorcycleId, targetMotorcycle.id),
          ),
        )
        .returning();

      if (result.length === 0) {
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
    await db
      .delete(issues)
      .where(
        and(
          eq(issues.id, Number.parseInt(fields.issueId as string)),
          eq(issues.motorcycleId, targetMotorcycle.id),
        ),
      );

    return respond({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-edit") {
    try {
      const payload = parseMotorcycleEditPayload(fields);

      console.log("Editing motorcycle:", payload);

      await db
        .update(motorcycles)
        .set(payload)
        .where(
          and(
            eq(motorcycles.id, targetMotorcycle.id),
            eq(motorcycles.userId, user.id),
          ),
        );

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
    await db
      .delete(maintenanceRecords)
      .where(eq(maintenanceRecords.motorcycleId, targetMotorcycle.id));
    await db.delete(issues).where(eq(issues.motorcycleId, targetMotorcycle.id));
    await db
      .delete(locationRecords)
      .where(eq(locationRecords.motorcycleId, targetMotorcycle.id));
    await db
      .delete(documentMotorcycles)
      .where(eq(documentMotorcycles.motorcycleId, targetMotorcycle.id));
    await db
      .delete(torqueSpecs)
      .where(eq(torqueSpecs.motorcycleId, targetMotorcycle.id));
    await db.delete(motorcycles).where(eq(motorcycles.id, targetMotorcycle.id));

    return redirect("/");
  }

  if (intent === "motorcycle-image") {
    const editMotorcycle: EditorMotorcycle = {
      image: fields.image as string,
    };

    await db
      .update(motorcycles)
      .set(editMotorcycle)
      .where(
        and(
          eq(motorcycles.id, targetMotorcycle.id),
          eq(motorcycles.userId, user.id),
        ),
      );

    return respond({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-odo") {
    await db
      .update(motorcycles)
      .set({
        manualOdo: parseIntSafe(fields.manualOdo as string),
      } satisfies EditorMotorcycle)
      .where(
        and(
          eq(motorcycles.id, targetMotorcycle.id),
          eq(motorcycles.userId, user.id),
        ),
      );
    return respond(
      { success: true, intent: "motorcycle-odo" },
      { status: 200 },
    );
  }

  if (intent === "maintenance-add") {
    try {
      const payload = parseMaintenancePayload(fields, motorcycleId);

      const item = await db
        .insert(maintenanceRecords)
        .values(payload)
        .returning();

      console.log("Inserted Maintenance Item:", item);
      return respond({ success: true }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Wartungseintrag konnte nicht gespeichert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "maintenance-edit") {
    const maintenanceId = Number.parseInt(
      (fields.maintenanceId as string) ?? (fields.logId as string) ?? "",
      10,
    );

    if (Number.isNaN(maintenanceId)) {
      return respond(
        {
          success: false,
          message: "Wartungseintrag konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    try {
      const payload = parseMaintenancePayload(fields, motorcycleId);
      const { motorcycleId: _ignore, ...updatePayload } = payload;

      const item = await db
        .update(maintenanceRecords)
        .set(updatePayload)
        .where(
          and(
            eq(maintenanceRecords.id, maintenanceId),
            eq(maintenanceRecords.motorcycleId, motorcycleId),
          ),
        )
        .returning();

      console.log("Edited Maintenance Item:", item);

      if (item.length === 0) {
        return respond(
          {
            success: false,
            message: "Wartungseintrag wurde nicht gefunden.",
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
            "Wartungseintrag konnte nicht aktualisiert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "maintenance-delete") {
    console.log("Deleting maintenance item with ID:", fields.logId);
    await db
      .delete(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.id, Number.parseInt(fields.logId as string)),
          eq(maintenanceRecords.motorcycleId, targetMotorcycle.id),
        ),
      );

    return respond({ success: true }, { status: 200 });
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

    const [insertedRecord] = await db
      .insert(locationRecords)
      .values(newLocationRecord)
      .returning();

    return respond(
      {
        success: true,
        intent: "location-update",
        location: {
          ...insertedRecord,
          odometer,
          locationName: selectedLocation.name,
        },
      },
      { status: 200 },
    );
  }

  if (intent === "torque-add") {
    try {
      const newSpec = parseTorquePayload(fields, motorcycleId);

      await db.insert(torqueSpecs).values(newSpec);

      return respond({ success: true, intent: "torque-add" }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Drehmomentwert konnte nicht gespeichert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "torque-edit") {
    const specId = Number.parseInt((fields.torqueId as string) ?? "");
    if (Number.isNaN(specId)) {
      return respond(
        {
          success: false,
          message: "Drehmomentwert konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    try {
      const payload = parseTorquePayload(fields, motorcycleId);
      const { motorcycleId: _ignore, ...updatePayload } = payload;

      const result = await db
        .update(torqueSpecs)
        .set(updatePayload)
        .where(
          and(
            eq(torqueSpecs.id, specId),
            eq(torqueSpecs.motorcycleId, motorcycleId),
          ),
        )
        .returning();

      if (result.length === 0) {
        return respond(
          {
            success: false,
            message: "Drehmomentwert wurde nicht gefunden.",
          },
          { status: 404 },
        );
      }

      return respond({ success: true, intent: "torque-edit" }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Drehmomentwert konnte nicht aktualisiert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "torque-delete") {
    const specId = Number.parseInt((fields.torqueId as string) ?? "");
    if (Number.isNaN(specId)) {
      return respond(
        {
          success: false,
          message: "Drehmomentwert konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    await db
      .delete(torqueSpecs)
      .where(
        and(
          eq(torqueSpecs.id, specId),
          eq(torqueSpecs.motorcycleId, targetMotorcycle.id),
        ),
      );

    return respond({ success: true, intent: "torque-delete" }, { status: 200 });
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
    documents,
  } = loaderData;
  const { make, model } = motorcycle;
  const validTabs = [
    "info",
    "maintenance",
    "torque",
    "insights",
    "documents",
  ] as const;
  const [activeTab, setActiveTab] =
    useState<(typeof validTabs)[number]>("info");

  const handleTabChange = (value: string) => {
    const nextValue = (validTabs as readonly string[]).includes(value)
      ? (value as (typeof validTabs)[number])
      : activeTab;
    setActiveTab(nextValue);
  };

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
        <div className="lg:col-span-3 xl:col-span-3">
          <div className="lg:hidden">
            <MotorcycleMobileTabs
              motorcycle={motorcycle}
              issues={issues}
              maintenanceEntries={maintenanceEntries}
              torqueSpecifications={torqueSpecifications}
              documents={documents}
              currentOdo={currentOdo}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
          <div className="hidden lg:block">
            <MotorcycleDesktopTabs
              motorcycle={motorcycle}
              maintenanceEntries={maintenanceEntries}
              torqueSpecifications={torqueSpecifications}
              documents={documents}
              currentOdo={currentOdo}
              activeTab={activeTab === "info" ? "maintenance" : activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        </div>
      </div>
    </MotorcycleProvider>
  );
}
