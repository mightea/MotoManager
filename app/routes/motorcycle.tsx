import type { Route } from "./+types/motorcycle";
import { getDb } from "~/db";
import {
  issues,
  documents,
  documentMotorcycles,
  locationRecords,
  locations,
  maintenanceRecords,
  motorcycles,
  torqueSpecs,
  type EditorIssue,
  type EditorMotorcycle,
  type Motorcycle,
  type NewCurrentLocationRecord,
  type NewIssue,
  type NewMaintenanceRecord,
  type NewTorqueSpecification,
} from "~/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import MotorcycleInfo from "~/components/motorcycle-info";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import MaintenanceLogTable from "~/components/maintenance-log-table";
import { OpenIssuesCard } from "~/components/open-issues-card";
import { Button } from "~/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AddMaintenanceLogDialog } from "~/components/add-maintenance-log-dialog";
import { data } from "react-router";
import { parseIntSafe } from "~/utils/numberUtils";
import { MotorcycleProvider } from "~/contexts/MotorcycleProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import TorqueSpecificationsPanel from "~/components/torque-specifications-panel";
import DocumentList, {
  type DocumentListItem,
} from "~/components/document-list";
import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export async function loader({ params }: Route.LoaderArgs) {
  const db = await getDb();

  const motorcycleId = Number.parseInt(params.motorcycleId);

  if (isNaN(motorcycleId)) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  const result = await db.query.motorcycles.findFirst({
    where: eq(motorcycles.id, motorcycleId),
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
      eq(documentMotorcycles.documentId, documents.id)
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

  const documentSummaries: DocumentListItem[] = Array.from(documentsMap.values())
    .filter(
      (doc) => doc.motorcycleIds.length === 0 || doc.motorcycleIds.includes(motorcycleId)
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
  ];

  // Get the current odometer reading, which is the highest value
  const currentOdo = odos.sort((a, b) => b - a).at(0);

  return {
    motorcycle: result,
    maintenance: maintenanceItems,
    issues: issuesItems,
    currentOdo: currentOdo ?? result.initialOdo,
    currentLocation: currentLocation ?? null,
    locationHistory,
    torqueSpecifications,
    documents: documentSummaries,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const db = await getDb();

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);

  const { intent } = fields;
  console.log("Action called with intent:", intent);
  console.log("Fields:", fields);

  if (intent === "issue-add") {
    const newIssue: NewIssue = {
      //: new Date(data.dateAdded as string),
      description: fields.description as string,
      priority: fields.priority as "low" | "medium" | "high",
      status: fields.status as "new" | "in_progress" | "done",
      motorcycleId: Number.parseInt(params.motorcycleId),
      odo: Number.parseInt(fields.odo as string),
      date: fields.date as string,
    };

    console.log("Adding new issue:", newIssue);

    const result = await db.insert(issues).values(newIssue);
    console.log(result);
    return data({ success: true }, { status: 200 });
  }

  if (intent === "issue-edit") {
    const editIssue: EditorIssue = {
      id: Number.parseInt(fields.issueId as string),
      description: fields.description as string,
      priority: fields.priority as "low" | "medium" | "high",
      status: fields.status as "new" | "in_progress" | "done",

      motorcycleId: Number.parseInt(params.motorcycleId),
      odo: Number.parseInt(fields.odo as string),
      date: fields.date as string,
    };

    console.log("Editing issue:", editIssue);

    await db
      .update(issues)
      .set(editIssue)
      .where(eq(issues.id, Number.parseInt(fields.issueId as string)));

    return data({ success: true }, { status: 200 });
  }

  if (intent === "issue-delete") {
    console.log("Deleting issue with ID:", fields.issueId);
    await db
      .delete(issues)
      .where(eq(issues.id, Number.parseInt(fields.issueId as string)));

    return data({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-edit") {
    const editMotorcycle: EditorMotorcycle = {
      id: Number.parseInt(fields.motorcycleId as string),
      model: fields.model as string,
      make: fields.make as string,
      modelYear: Number.parseInt(fields.modelYear as string),
      isVeteran: Boolean(fields.isVeteran),
      firstRegistration: fields.firstRegistration as string,
      purchaseDate: fields.purchaseDate as string,
      purchasePrice: Number.parseFloat(fields.purchasePrice as string),
      lastInspection: fields.lastInspection as string,
      vehicleIdNr: fields.vehicleIdNr as string,
      vin: fields.vin as string,
      numberPlate: fields.numberPlate as string,
      initialOdo: Number.parseInt(fields.initialOdo as string),
    };

    console.log("Editing motorcycle:", editMotorcycle);

    await db
      .update(motorcycles)
      .set(editMotorcycle)
      .where(
        eq(motorcycles.id, Number.parseInt(fields.motorcycleId as string))
      );

    return data({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-image") {
    const editMotorcycle: EditorMotorcycle = {
      image: fields.image as string,
    };

    await db
      .update(motorcycles)
      .set(editMotorcycle)
      .where(
        eq(motorcycles.id, Number.parseInt(fields.motorcycleId as string))
      );

    return data({ success: true }, { status: 200 });
  }

  if (intent === "motorcycle-odo") {
    await db
      .update(motorcycles)
      .set({
        manualOdo: parseIntSafe(fields.manualOdo as string),
      } satisfies EditorMotorcycle)
      .where(
        eq(motorcycles.id, Number.parseInt(fields.motorcycleId as string))
      );
    return data({ success: true, intent: "motorcycle-odo" }, { status: 200 });
  }

  if (intent === "maintenance-add") {
    console.log(formData);
    const item = await db
      .insert(maintenanceRecords)
      .values(fields as unknown as NewMaintenanceRecord)
      .returning();

    console.log("Inserted Maintenance Item:", item);
    return data({ success: true }, { status: 200 });
  }

  if (intent === "maintenance-edit") {
    const item = await db
      .update(maintenanceRecords)
      .set(fields)
      .where(
        eq(
          maintenanceRecords.id,
          Number.parseInt(fields.maintenanceId as string)
        )
      )
      .returning();

    console.log("Edited Maintenance Item:", item);

    return data({ success: true }, { status: 200 });
  }

  if (intent === "maintenance-delete") {
    console.log("Deleting maintenance item with ID:", fields.logId);
    await db
      .delete(maintenanceRecords)
      .where(
        eq(maintenanceRecords.id, Number.parseInt(fields.logId as string))
      );

    return data({ success: true }, { status: 200 });
  }

  if (intent === "location-update") {
    console.log("Updating storage location to ID:", fields);

    const motorcycleId = Number.parseInt(params.motorcycleId);
    if (Number.isNaN(motorcycleId)) {
      return data(
        { success: false, message: "Motorrad konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }

    const locationIdRaw =
      (fields.storageLocationId as string) ?? (fields.locationId as string);
    const locationId = Number.parseInt(locationIdRaw ?? "");

    if (Number.isNaN(locationId)) {
      return data(
        { success: false, message: "Standort ist erforderlich." },
        { status: 400 }
      );
    }

    const date = (fields.date as string) || undefined;
    const odometerRaw = fields.odometer as string | number | undefined;
    const parsedOdometer = Number.parseInt(odometerRaw?.toString() ?? "", 10);
    const odometer = Number.isNaN(parsedOdometer) ? null : parsedOdometer;

    const newLocationRecord: NewCurrentLocationRecord = {
      motorcycleId,
      locationId,
      ...(date ? { date } : {}),
      ...(odometer !== null ? { odometer } : {}),
    };

    const [insertedRecord] = await db
      .insert(locationRecords)
      .values(newLocationRecord)
      .returning();

    const [location] = await db
      .select({
        id: locations.id,
        name: locations.name,
      })
      .from(locations)
      .where(eq(locations.id, insertedRecord.locationId))
      .limit(1);

    return data(
      {
        success: true,
        intent: "location-update",
        location: {
          ...insertedRecord,
          odometer,
          locationName: location?.name ?? null,
        },
      },
      { status: 200 }
    );
  }

  if (intent === "torque-add") {
    const motorcycleId = Number.parseInt(params.motorcycleId);
    if (Number.isNaN(motorcycleId)) {
      return data(
        { success: false, message: "Motorrad konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }

    const torque = Number.parseFloat((fields.torque as string) ?? "");
    if (Number.isNaN(torque)) {
      return data(
        { success: false, message: "Drehmoment ist ungültig." },
        { status: 400 }
      );
    }

    const category = (fields.category as string | undefined)?.trim();
    const name = (fields.name as string | undefined)?.trim();
    if (!category || !name) {
      return data(
        { success: false, message: "Kategorie und Bezeichnung sind erforderlich." },
        { status: 400 }
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

    return data({ success: true, intent: "torque-add" }, { status: 200 });
  }

  if (intent === "torque-edit") {
    const specId = Number.parseInt((fields.torqueId as string) ?? "");
    if (Number.isNaN(specId)) {
      return data(
        { success: false, message: "Drehmomentwert konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }

    const category = (fields.category as string | undefined)?.trim();
    const name = (fields.name as string | undefined)?.trim();
    if (!category || !name) {
      return data(
        { success: false, message: "Kategorie und Bezeichnung sind erforderlich." },
        { status: 400 }
      );
    }

    const torque = Number.parseFloat((fields.torque as string) ?? "");
    if (Number.isNaN(torque)) {
      return data(
        { success: false, message: "Drehmoment ist ungültig." },
        { status: 400 }
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
      .where(eq(torqueSpecs.id, specId));

    return data({ success: true, intent: "torque-edit" }, { status: 200 });
  }

  if (intent === "torque-delete") {
    const specId = Number.parseInt((fields.torqueId as string) ?? "");
    if (Number.isNaN(specId)) {
      return data(
        { success: false, message: "Drehmomentwert konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }

    await db.delete(torqueSpecs).where(eq(torqueSpecs.id, specId));

    return data({ success: true, intent: "torque-delete" }, { status: 200 });
  }

  return data(
    { success: false, message: `Unhandled intent ${intent}` },
    { status: 500 }
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
  const location = useLocation();
  const navigate = useNavigate();
  const validTabs = ["maintenance", "torque", "documents"] as const;

  const getTabFromHash = (hash: string) => {
    const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
    return (validTabs as readonly string[]).includes(normalized)
      ? normalized
      : "maintenance";
  };

  const [activeTab, setActiveTab] = useState<string>(() =>
    getTabFromHash(location.hash)
  );

  useEffect(() => {
    const hashTab = getTabFromHash(location.hash);
    if (hashTab !== activeTab) {
      setActiveTab(hashTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: `#${value}`,
      },
      { replace: true }
    );
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
        <div className="lg:col-span-2 xl:col-span-2 space-y-8">
          <MotorcycleInfo />
          <OpenIssuesCard
            motorcycle={motorcycle}
            issues={issues}
            currentOdometer={currentOdo}
          />
        </div>
        <div className="lg:col-span-3 xl:col-span-3">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="maintenance">Wartungsprotokoll</TabsTrigger>
              <TabsTrigger value="torque">Drehmomentwerte</TabsTrigger>
              <TabsTrigger value="documents">Dokumente</TabsTrigger>
            </TabsList>
            <TabsContent value="maintenance">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-2xl">Wartungsprotokoll</CardTitle>
                    <AddMaintenanceLogDialog
                      motorcycle={motorcycle}
                      currentOdometer={currentOdo}
                    >
                      <Button>
                        <PlusCircle className="h-4 w-4" />
                        Eintrag hinzufügen
                      </Button>
                    </AddMaintenanceLogDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <MaintenanceLogTable
                    logs={maintenanceEntries}
                    motorcycle={motorcycle}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="torque">
              <TorqueSpecificationsPanel
                motorcycleId={motorcycle.id}
                specs={torqueSpecifications}
              />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentList documents={documents} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MotorcycleProvider>
  );
}
