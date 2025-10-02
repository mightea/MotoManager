import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import db from "~/db";
import { motorcycles, type Motorcycle } from "~/db/schema";
import { MotorcycleSummaryCard } from "~/components/motorcycle-summary-card";
import { Button } from "~/components/ui/button";
import { Bike, PlusCircle } from "lucide-react";
import { AddMotorcycleDialog } from "~/components/add-motorcycle-dialog";

type MotorcycleData = Motorcycle & {
  numberOfIssues: number;
  odometer: number;
  odometerThisYear: number;
};

export async function loader({}: Route.LoaderArgs) {
  const motorcycles = await db.query.motorcycles.findMany();
  const issues = await db.query.issues.findMany();
  const maintenance = await db.query.maintenanceRecords.findMany();
  const locationHistory = await db.query.locationRecords.findMany();

  const year = new Date().getFullYear();

  const items: MotorcycleData[] = motorcycles.map((moto) => {
    const mIssues = issues.filter((i) => i.motorcycleId === moto.id);
    const maintenanceItems = maintenance.filter(
      (m) => m.motorcycleId === moto.id
    );
    const locationItems = locationHistory.filter(
      (record) => record.motorcycleId === moto.id && record.odometer !== null
    );

    const issuesCount = mIssues.filter((i) => i.status !== "done").length;

    const odometerValues = [
      moto.initialOdo,
      moto.manualOdo ?? undefined,
      ...maintenanceItems.map((m) => m.odo),
      ...mIssues.map((i) => i.odo),
      ...locationItems.map((record) => record.odometer ?? undefined),
    ].filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );

    const maxOdo = odometerValues.reduce(
      (max, value) => (value > max ? value : max),
      moto.initialOdo
    );

    const odometerByYear = new Map<number, number>();

    const registerOdoForYear = (date: string, odo: number) => {
      const entryYear = new Date(date).getFullYear();
      if (!Number.isFinite(entryYear)) {
        return;
      }
      const currentValue = odometerByYear.get(entryYear);
      if (currentValue === undefined || odo > currentValue) {
        odometerByYear.set(entryYear, odo);
      }
    };

    mIssues.forEach((issue) => {
      if (issue.date) {
        registerOdoForYear(issue.date, issue.odo);
      }
    });
    maintenanceItems.forEach((item) => registerOdoForYear(item.date, item.odo));
    locationItems.forEach((item) => {
      if (item.date && item.odometer !== null) {
        registerOdoForYear(item.date, item.odometer);
      }
    });

    const previousYearEntries = Array.from(odometerByYear.entries())
      .filter(([entryYear]) => entryYear < year)
      .sort((a, b) => b[0] - a[0]);

    const baselineOdo = previousYearEntries.at(0)?.[1] ?? moto.initialOdo;
    console.log({ baselineOdo, previousYearEntries });

    const odometerThisYear = Math.max(0, maxOdo - baselineOdo);

    return {
      ...moto,
      numberOfIssues: issuesCount,
      odometer: maxOdo,
      odometerThisYear,
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
