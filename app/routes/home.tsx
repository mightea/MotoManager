import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import db from "~/db";
import { motorcycles } from "~/db/schema";
import { MotorcycleSummaryCard } from "~/components/motorcycle-summary-card";
import { Button } from "~/components/ui/button";
import { Bike, PlusCircle } from "lucide-react";
import { AddMotorcycleDialog } from "~/components/add-motorcycle-dialog";

type MotorcycleData = {
  id: number;
  model: string;
  make: string;

  modelYear: number;

  numberOfIssues: number;
  odometer: number;
  odometerThisYear: number;
  lastInspection: string | null;
  isVeteran: boolean;
};

export async function loader({}: Route.LoaderArgs) {
  const motorcycles = await db.query.motorcycles.findMany();
  const issues = await db.query.issues.findMany();
  const maintenance = await db.query.maintenance.findMany();

  const year = new Date().getFullYear();

  const items: MotorcycleData[] = motorcycles.map((moto) => {
    const mIssues = issues.filter((i) => i.motorcycleId === moto.id);
    const maintenanceItems = maintenance.filter(
      (m) => m.motorcycleId === moto.id
    );

    const issuesCount = mIssues.filter((i) => i.status !== "done").length;

    const odos = [
      ...maintenanceItems.map((m) => m.odo),
      ...mIssues.map((i) => i.odo),
    ];

    const maxOdo = odos.sort((a, b) => b - a).at(0) ?? moto.initialOdo;

    const odosLastYear = [
      moto.initialOdo,
      ...mIssues
        .filter((m) => new Date(m.date).getFullYear() < year)
        .map((i) => i.odo),
      ...maintenanceItems
        .filter((m) => new Date(m.date).getFullYear() < year)
        .map((m) => m.odo),
    ];

    const maxOdoLastYear =
      odosLastYear.sort((a, b) => b - a).at(0) ?? moto.initialOdo;

    console.log(maxOdo, maxOdoLastYear);

    return {
      ...moto,
      numberOfIssues: issuesCount,
      odometer: maxOdo,
      odometerThisYear: maxOdo - maxOdoLastYear,
    };
  });

  return { motorcycles, items };
}

export async function action() {
  const motorcycle = await db
    .insert(motorcycles)
    .values({
      model: "",
      make: "",
      vin: "",
      vehicleIdNr: "",
      licenseType: "regular",
      firstRegistration: "",
      lastInspection: "",
      isVeteran: false,
      initialOdo: 0,
    })
    .returning();

  return redirect(`/motorcycle/${motorcycle[0].id}/edit`);
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { items: motorcycles } = loaderData;

  const getMotorcycleAge = (dateString: string): string | null => {
    const date = new Date(dateString);
    return new Date().getFullYear() - date.getFullYear();
  };

  return (
    <>
      <title>MotoManager</title>
      <div>
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary">
                Alle Motorräder
              </h1>
              <p className="text-muted-foreground mt-1">
                Eine Übersicht deiner gesamten Sammlung.
              </p>
            </div>
            <AddMotorcycleDialog>
              <Button variant="outline">
                <PlusCircle className="h-4 w-4" />
                Motorrad hinzufügen
              </Button>
            </AddMotorcycleDialog>
          </div>
        </header>
        {motorcycles.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {motorcycles.map((moto) => (
              <MotorcycleSummaryCard key={moto.id} {...moto} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Bike className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">
              Noch keine Motorräder
            </h2>
            <p className="mt-2 text-muted-foreground">
              Füge dein erstes Motorrad hinzu, um loszulegen.
            </p>
            <div className="mt-6">
              <AddMotorcycleDialog>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Dein erstes Motorrad
                  hinzufügen
                </Button>
              </AddMotorcycleDialog>
            </div>
          </div>
        )}{" "}
      </div>
    </>
  );
}
