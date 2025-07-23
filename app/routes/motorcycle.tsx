import type { Route } from "./+types/motorcycle";
import db from "~/db";
import {
  issues,
  maintenanceRecords,
  motorcycles,
  type EditorIssue,
  type EditorMotorcycle,
  type Motorcycle,
  type NewIssue,
  type NewMaintenanceRecord,
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

export async function loader({ params }: Route.LoaderArgs) {
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
  };
}

export async function action({ request, params }: Route.ActionArgs) {
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
  } = loaderData;
  const { make, model } = motorcycle;

  return (
    <>
      <title>{`${make} ${model} - MotoManager`}</title>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 xl:col-span-2 space-y-8">
          <MotorcycleInfo
            motorcycle={motorcycle}
            currentOdometer={currentOdo}
          />
          <OpenIssuesCard
            motorcycle={motorcycle}
            issues={issues}
            currentOdometer={currentOdo}
          />
        </div>
        <div className="lg:col-span-3 xl:col-span-3">
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
        </div>
      </div>
    </>
  );
}
