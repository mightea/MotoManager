import type { Route } from "./+types/motorcycle";
import db from "~/db";
import { maintenance, motorcycles, type Motorcycle } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import MotorcycleInfo from "~/components/motorcycle-info";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import MaintenanceLogTable from "~/components/maintenance-log-table";
import { OpenIssuesCard } from "~/components/open-issues-card";

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

  return { motorcycle: result, maintenance: maintenanceItems };
}

export default function Motorcycle({ loaderData }: Route.ComponentProps) {
  const { motorcycle, maintenance: maintenanceEntries } = loaderData;
  const { id, make, model, vin } = motorcycle;

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 xl:col-span-2 space-y-8">
        <MotorcycleInfo motorcycle={motorcycle} currentOdometer={0} />
        <OpenIssuesCard motorcycle={motorcycle} />
      </div>
      <div className="lg:col-span-3 xl:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-2xl">Wartungsprotokoll</CardTitle>
              {/* <AddMaintenanceLogDialog motorcycle={selectedMotorcycle}> */}
              {/*   <Button> */}
              {/*     <PlusCircle className="mr-2 h-4 w-4" /> Eintrag hinzufügen */}
              {/*   </Button> */}
              {/* </AddMaintenanceLogDialog> */}
            </div>
          </CardHeader>
          <CardContent>
            <MaintenanceLogTable logs={maintenanceEntries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
