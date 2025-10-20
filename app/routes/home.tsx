import { useMemo } from "react";
import { Link, data, redirect } from "react-router";
import type { Route } from "./+types/home";
import { getDb } from "~/db";
import {
  motorcycles,
  issues as issuesTable,
  maintenanceRecords,
  locationRecords,
  type Motorcycle,
} from "~/db/schema";
import { createMotorcycle } from "~/db/providers/motorcycles.server";
import { MotorcycleSummaryCard } from "~/components/motorcycle-summary-card";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Bike, PlusCircle, FileText } from "lucide-react";
import { AddMotorcycleDialog } from "~/components/add-motorcycle-dialog";
import { formatCurrency } from "~/utils/numberUtils";
import { inArray, eq } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import {
  buildDashboardData,
  type DashboardStats,
  type MotorcycleDashboardItem,
} from "~/utils/home-stats";

type LoaderData = {
  motorcycles: Motorcycle[];
  items: MotorcycleDashboardItem[];
  stats: DashboardStats;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const motorcyclesList = await db.query.motorcycles.findMany({
    where: eq(motorcycles.userId, user.id),
  });

  const motorcycleIds = motorcyclesList.map((moto) => moto.id);

  const issues =
    motorcycleIds.length > 0
      ? await db.query.issues.findMany({
          where: inArray(issuesTable.motorcycleId, motorcycleIds),
        })
      : [];

  const maintenance =
    motorcycleIds.length > 0
      ? await db.query.maintenanceRecords.findMany({
          where: inArray(maintenanceRecords.motorcycleId, motorcycleIds),
        })
      : [];

  const locationHistory =
    motorcycleIds.length > 0
      ? await db.query.locationRecords.findMany({
          where: inArray(locationRecords.motorcycleId, motorcycleIds),
        })
      : [];

  const year = new Date().getFullYear();

  const { items, stats } = buildDashboardData({
    motorcycles: motorcyclesList,
    issues,
    maintenance,
    locationHistory,
    year,
  });

  return data<LoaderData>(
    { motorcycles: motorcyclesList, items, stats },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const inserted = await createMotorcycle(db, {
    model: "",
    make: "",
    vin: "",
    vehicleIdNr: "",
    firstRegistration: "",
    isVeteran: false,
    initialOdo: 0,
    userId: user.id,
  });

  const motorcycle = inserted.at(0);
  if (!motorcycle) {
    throw new Error("Motorrad konnte nicht erstellt werden.");
  }

  const response = redirect(`/motorcycle/${motorcycle.id}/edit`);
  mergeHeaders(headers ?? {}).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { items: motorcycles, stats } = loaderData;
  const hasMotorcycles = motorcycles.length > 0;
  const kmFormatter = useMemo(
    () =>
      new Intl.NumberFormat("de-CH", {
        maximumFractionDigits: 0,
      }),
    [],
  );
  const statsCards = hasMotorcycles
    ? [
        {
          label: "Kilometer dieses Jahr",
          value: `${kmFormatter.format(stats.totalKmThisYear)} km`,
          hint: `Summe aller registrierten Fahrten ${stats.year}.`,
        },
        {
          label: "Kilometer insgesamt",
          value: `${kmFormatter.format(stats.totalKmOverall)} km`,
          hint: "Gesamter gemessener Kilometerstand aller Bikes.",
        },
        {
          label: "Aktive To-dos",
          value: stats.totalActiveIssues.toString(),
          hint: "Noch offene Issues über alle Motorräder hinweg.",
        },
        {
          label: `Wartungskosten ${stats.year}`,
          value: formatCurrency(stats.totalMaintenanceCostThisYear),
          hint: "Summe der erfassten Kosten im aktuellen Jahr.",
        },
        {
          label: "Veteranen-Bikes",
          value: stats.veteranCount.toString(),
          hint: "Anzahl Motorräder mit Veteranen-Status.",
        },
        {
          label: "Fleissigstes Bike",
          value: stats.topRider
            ? `${
                [stats.topRider.make, stats.topRider.model]
                  .filter(Boolean)
                  .join(" ") || "Unbekannt"
              }`
            : "–",
          hint: stats.topRider
            ? `${kmFormatter.format(
                stats.topRider.odometerThisYear,
              )} km in ${stats.year}`
            : "Noch keine Kilometer erfasst.",
        },
      ]
    : [];

  return (
    <>
      <title>MotoManager</title>
      <div className="space-y-8">
        {hasMotorcycles ? (
          <>
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-headline font-semibold text-foreground">
                  Deine Motorräder
                </h1>
                <p className="text-sm text-muted-foreground">
                  Überblick über Wartung, Kilometerstände und aktuelle
                  Dokumente.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <AddMotorcycleDialog>
                  <Button variant="outline" className="gap-2">
                    <PlusCircle className="h-4 w-4" /> Motorrad hinzufügen
                  </Button>
                </AddMotorcycleDialog>
                <Button asChild variant="secondary" className="gap-2">
                  <Link to="/documents">
                    <FileText className="h-4 w-4" /> Dokumente
                  </Link>
                </Button>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {motorcycles.map((moto) => (
                <MotorcycleSummaryCard key={moto.id} {...moto} />
              ))}
            </div>
          </>
        ) : (
          <>
            <Card className="md:p-8">
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
                    Erste Schritte
                  </p>
                  <CardTitle className="mt-2 text-3xl font-headline leading-tight md:text-[2.35rem]">
                    Willkommen im Cockpit deiner Bikes
                  </CardTitle>
                  <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                    Lege dein erstes Motorrad an, um Wartungen, Dokumente und
                    Standorte im Blick zu behalten.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <AddMotorcycleDialog>
                    <Button className="h-10 gap-2 px-5">
                      <PlusCircle className="h-4 w-4" /> Motorrad hinzufügen
                    </Button>
                  </AddMotorcycleDialog>
                  <Button
                    asChild
                    variant="secondary"
                    className="h-10 gap-2 px-5"
                  >
                    <Link to="/documents">
                      <FileText className="h-4 w-4" /> Dokumente öffnen
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border/50 bg-background/60 px-6 py-12 text-center">
                  <Bike className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">
                      Noch keine Motorräder erfasst
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Lege jetzt los und füge dein erstes Motorrad hinzu.
                    </p>
                  </div>
                  <AddMotorcycleDialog>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" /> Dein erstes
                      Motorrad hinzufügen
                    </Button>
                  </AddMotorcycleDialog>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {hasMotorcycles && (
          <>
            <div>
              <h2 className="text-3xl font-headline font-semibold text-foreground">
                Jahresstatistiken
              </h2>
              <p className="text-sm text-muted-foreground">
                Aggregierte Kennzahlen deiner Flotte {stats.year}.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {statsCards.map((card) => (
                <Card
                  key={card.label}
                  className="rounded-xl border-border/40 bg-white/70 dark:bg-slate-900/60"
                >
                  <CardHeader className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xl font-semibold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
