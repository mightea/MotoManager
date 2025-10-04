import { useMemo } from "react";
import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import db from "~/db";
import { motorcycles, type Motorcycle } from "~/db/schema";
import { MotorcycleSummaryCard } from "~/components/motorcycle-summary-card";
import { Button } from "~/components/ui/button";
import { Bike, PlusCircle, FileText } from "lucide-react";
import { AddMotorcycleDialog } from "~/components/add-motorcycle-dialog";
import { formatCurrency } from "~/utils/numberUtils";

type MotorcycleData = Motorcycle & {
  numberOfIssues: number;
  odometer: number;
  odometerThisYear: number;
};

type DashboardStats = {
  year: number;
  totalMotorcycles: number;
  totalKmThisYear: number;
  totalKmOverall: number;
  totalActiveIssues: number;
  totalMaintenanceCostThisYear: number;
  veteranCount: number;
  topRider: null | {
    id: number;
    make: string;
    model: string;
    odometerThisYear: number;
  };
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

    const baselineOdo = previousYearEntries.at(0)?.[1] ?? moto.initialOdo ?? 0;
    const odometerThisYear = Math.max(0, maxOdo - baselineOdo);

    return {
      ...moto,
      numberOfIssues: issuesCount,
      odometer: maxOdo,
      odometerThisYear,
    };
  });

  const totalKmThisYear = items.reduce(
    (sum, moto) => sum + (moto.odometerThisYear ?? 0),
    0
  );
  const totalKmOverall = items.reduce((sum, moto) => {
    const distance = Math.max(0, (moto.odometer ?? 0) - (moto.initialOdo ?? 0));
    return sum + distance;
  }, 0);
  const totalActiveIssues = items.reduce(
    (sum, moto) => sum + (moto.numberOfIssues ?? 0),
    0
  );
  const totalMaintenanceCostThisYear = maintenance.reduce((sum, entry) => {
    if (!entry.date || entry.cost == null) {
      return sum;
    }
    const entryYear = new Date(entry.date).getFullYear();
    if (entryYear !== year) {
      return sum;
    }
    return sum + (entry.cost ?? 0);
  }, 0);
  const veteranCount = motorcycles.filter((moto) => moto.isVeteran).length;
  const topRiderCandidate = items.reduce<MotorcycleData | null>((acc, moto) => {
    if (moto.odometerThisYear <= 0) {
      return acc;
    }
    if (acc === null || moto.odometerThisYear > acc.odometerThisYear) {
      return moto;
    }
    return acc;
  }, null);

  const stats: DashboardStats = {
    year,
    totalMotorcycles: motorcycles.length,
    totalKmThisYear,
    totalKmOverall,
    totalActiveIssues,
    totalMaintenanceCostThisYear,
    veteranCount,
    topRider: topRiderCandidate
      ? {
          id: topRiderCandidate.id,
          make: topRiderCandidate.make,
          model: topRiderCandidate.model,
          odometerThisYear: topRiderCandidate.odometerThisYear,
        }
      : null,
  };

  return { motorcycles, items, stats };
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
  const { items: motorcycles, stats } = loaderData;
  const hasMotorcycles = motorcycles.length > 0;
  const kmFormatter = useMemo(
    () =>
      new Intl.NumberFormat("de-CH", {
        maximumFractionDigits: 0,
      }),
    []
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
          label: "Fleißigstes Bike",
          value: stats.topRider
            ? `${[stats.topRider.make, stats.topRider.model]
                .filter(Boolean)
                .join(" ") || "Unbekannt"}`
            : "–",
          hint: stats.topRider
            ? `${kmFormatter.format(
                stats.topRider.odometerThisYear
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
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-headline font-semibold text-foreground">
                  Deine Motorräder
                </h1>
                <p className="text-sm text-muted-foreground">
                  Überblick über Wartung, Kilometerstände und aktuelle Dokumente.
                </p>
              </div>
              <div className="flex items-center gap-2">
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

            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {motorcycles.map((moto) => (
                <MotorcycleSummaryCard key={moto.id} {...moto} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-5 shadow-lg backdrop-blur-xl dark:border-border/30 dark:bg-slate-900/80 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
                    Erste Schritte
                  </p>
                  <h1 className="mt-2 text-3xl font-headline font-semibold leading-tight text-foreground md:text-[2.35rem]">
                    Willkommen im Cockpit deiner Bikes
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                    Lege dein erstes Motorrad an, um Wartungen, Dokumente und Standorte im Blick zu behalten.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <AddMotorcycleDialog>
                    <Button className="h-10 gap-2 px-5">
                      <PlusCircle className="h-4 w-4" /> Motorrad hinzufügen
                    </Button>
                  </AddMotorcycleDialog>
                  <Button asChild variant="secondary" className="h-10 gap-2 px-5">
                    <Link to="/documents">
                      <FileText className="h-4 w-4" /> Dokumente öffnen
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Bike className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-2xl font-semibold">
                Noch keine Motorräder erfasst
              </h2>
              <p className="mt-2 text-muted-foreground">
                Lege jetzt los und füge dein erstes Motorrad hinzu.
              </p>
              <div className="mt-6">
                <AddMotorcycleDialog>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Dein erstes Motorrad hinzufügen
                  </Button>
                </AddMotorcycleDialog>
              </div>
            </div>
          </>
        )}

        {hasMotorcycles && (
          <section className="rounded-2xl border border-border/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-border/30 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Jahresstatistiken
                </h2>
                <p className="text-sm text-muted-foreground">
                  Aggregierte Kennzahlen deiner Flotte {stats.year}.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statsCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-border/50 bg-background/80 p-4 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
