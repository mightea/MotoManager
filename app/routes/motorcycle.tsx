import type { Route } from "./+types/motorcycle";
import { getDb } from "~/db";
import {
  type EditorIssue,
  type EditorMotorcycle,
  type NewIssue,
  type NewMaintenanceRecord,
  type NewTorqueSpecification,
  type NewCurrentLocationRecord,
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
import { MotorcycleProvider } from "~/contexts/MotorcycleProvider";
import { type DocumentListItem } from "~/components/document-list";
import { MotorcycleDesktopTabs } from "~/components/motorcycle-desktop-tabs";
import { MotorcycleMobileTabs } from "~/components/motorcycle-mobile-tabs";
import { useState } from "react";
import { mergeHeaders, requireUser } from "~/services/auth.server";

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
    }));

  // Get all odometer readings from all items
  const odos = [
    result.initialOdo,
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
      motorcycle: result,
      maintenance: maintenanceItems,
      issues: issuesItems,
      currentOdo: currentOdo ?? result.initialOdo,
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
    const newIssue: NewIssue = {
      //: new Date(data.dateAdded as string),
      description: fields.description as string,
      priority: fields.priority as "low" | "medium" | "high",
      status: fields.status as "new" | "in_progress" | "done",
      motorcycleId,
      odo: Number.parseInt(fields.odo as string),
      date: fields.date as string,
    };

    console.log("Adding new issue:", newIssue);

    const result = await db.insert(issues).values(newIssue);
    console.log(result);
    return respond({ success: true }, { status: 200 });
  }

  if (intent === "issue-edit") {
    const editIssue: EditorIssue = {
      id: Number.parseInt(fields.issueId as string),
      description: fields.description as string,
      priority: fields.priority as "low" | "medium" | "high",
      status: fields.status as "new" | "in_progress" | "done",

      motorcycleId,
      odo: Number.parseInt(fields.odo as string),
      date: fields.date as string,
    };

    console.log("Editing issue:", editIssue);

    await db
      .update(issues)
      .set(editIssue)
      .where(
        and(
          eq(issues.id, Number.parseInt(fields.issueId as string)),
          eq(issues.motorcycleId, targetMotorcycle.id),
        ),
      );

    return respond({ success: true }, { status: 200 });
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
    const editMotorcycle: EditorMotorcycle = {
      id: targetMotorcycle.id,
      model: fields.model as string,
      make: fields.make as string,
      modelYear: Number.parseInt(fields.modelYear as string),
      isVeteran: fields.isVeteran === "true",
      isArchived: fields.isArchived === "true",
      firstRegistration: fields.firstRegistration as string,
      purchaseDate: fields.purchaseDate as string,
      purchasePrice: Number.parseFloat(fields.purchasePrice as string),
      vehicleIdNr: fields.vehicleIdNr as string,
      vin: fields.vin as string,
      numberPlate: fields.numberPlate as string,
      initialOdo: Number.parseInt(fields.initialOdo as string),
      currencyCode: fields.currencyCode as string,
    };

    console.log("Editing motorcycle:", editMotorcycle);

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
    const { ...rest } = fields as Record<string, unknown>;
    const item = await db
      .insert(maintenanceRecords)
      .values({
        ...(rest as unknown as NewMaintenanceRecord),
        motorcycleId,
      })
      .returning();

    console.log("Inserted Maintenance Item:", item);
    return respond({ success: true }, { status: 200 });
  }

  if (intent === "maintenance-edit") {
    const { ...rest } = fields as Record<string, unknown>;
    const item = await db.update(maintenanceRecords).set({
      ...(rest as unknown as NewMaintenanceRecord),
      motorcycleId,
    });

    console.log("Edited Maintenance Item:", item);

    return respond({ success: true }, { status: 200 });
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
    const torque = Number.parseFloat((fields.torque as string) ?? "");
    if (Number.isNaN(torque)) {
      return respond(
        { success: false, message: "Drehmoment ist ungültig." },
        { status: 400 },
      );
    }

    const category = (fields.category as string | undefined)?.trim();
    const name = (fields.name as string | undefined)?.trim();
    if (!category || !name) {
      return respond(
        {
          success: false,
          message: "Kategorie und Bezeichnung sind erforderlich.",
        },
        { status: 400 },
      );
    }

    const variationInput = fields.variation as string | undefined;
    const variationParsed = variationInput
      ? Number.parseFloat(variationInput)
      : undefined;
    const variation =
      variationParsed === undefined || Number.isNaN(variationParsed)
        ? null
        : variationParsed;

    const description =
      (fields.description as string | undefined)?.trim() || null;

    const newSpec: NewTorqueSpecification = {
      motorcycleId,
      category,
      name,
      torque,
      description,
      ...(variation !== null ? { variation } : {}),
    };

    await db.insert(torqueSpecs).values(newSpec);

    return respond({ success: true, intent: "torque-add" }, { status: 200 });
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

    const category = (fields.category as string | undefined)?.trim();
    const name = (fields.name as string | undefined)?.trim();
    if (!category || !name) {
      return respond(
        {
          success: false,
          message: "Kategorie und Bezeichnung sind erforderlich.",
        },
        { status: 400 },
      );
    }

    const torque = Number.parseFloat((fields.torque as string) ?? "");
    if (Number.isNaN(torque)) {
      return respond(
        { success: false, message: "Drehmoment ist ungültig." },
        { status: 400 },
      );
    }

    const variationInput = fields.variation as string | undefined;
    const variationParsed = variationInput
      ? Number.parseFloat(variationInput)
      : undefined;
    const variation =
      variationParsed === undefined || Number.isNaN(variationParsed)
        ? null
        : variationParsed;

    const description =
      (fields.description as string | undefined)?.trim() || null;

    await db
      .update(torqueSpecs)
      .set({
        category,
        name,
        torque,
        variation,
        description,
      })
      .where(
        and(
          eq(torqueSpecs.id, specId),
          eq(torqueSpecs.motorcycleId, targetMotorcycle.id),
        ),
      );

    return respond({ success: true, intent: "torque-edit" }, { status: 200 });
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
  const validTabs = ["info", "maintenance", "torque", "documents"] as const;
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
