import type { Route } from "./+types/motorcycle";
import db from "~/db";
import {
  issues,
  maintenance,
  motorcycles,
  type Motorcycle,
  type NewIssue,
} from "~/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import MotorcycleInfo from "~/components/motorcycle-info";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import MaintenanceLogTable from "~/components/maintenance-log-table";
import { OpenIssuesCard } from "~/components/open-issues-card";
import { Button } from "~/components/ui/button";
import { PlusCircle } from "lucide-react";

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

  const maintenanceItems = await db.query.maintenance.findMany({
    where: eq(maintenance.motorcycleId, motorcycleId),
    orderBy: [
      desc(maintenance.date), // Order by date descending
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
  const data = Object.fromEntries(formData);

  const { intent } = data;
  console.log("Action called with intent:", intent);

  if (intent === "issue-add") {
    const newIssue: NewIssue = {
      //: new Date(data.dateAdded as string),
      description: data.description as string,
      priority: data.priority as "low" | "medium" | "high",
      motorcycleId: Number.parseInt(params.motorcycleId),
      odo: Number.parseInt(data.odo as string),
      date: data.date as string,
    };

    console.log("Adding new issue:", newIssue);

    const result = await db.insert(issues).values(newIssue);
    console.log(result);
  }

  if (intent === "issue-delete") {
    console.log("Deleting issue with ID:", data.issueId);
    await db
      .delete(issues)
      .where(eq(issues.id, Number.parseInt(data.issueId as string)));
  }
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
                {/* <AddMaintenanceLogDialog motorcycle={selectedMotorcycle}> */}
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Eintrag hinzufügen
                </Button>
                {/* </AddMaintenanceLogDialog> */}
              </div>
            </CardHeader>
            <CardContent>
              <MaintenanceLogTable logs={maintenanceEntries} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
