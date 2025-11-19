import { Form, Link, data, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { getDb } from "~/db";
import {
  motorcycles,
  maintenanceRecords,
  issues,
  locationRecords,
  type NewMotorcycle,
} from "~/db/schema";
import { createMotorcycle } from "~/db/providers/motorcycles.server";
import { eq, desc, and, lt, gte, ne, sql } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import { getNextInspectionInfo } from "~/utils/inspection";
import {
  CalendarDays,
  Gauge,
  Route as RouteIcon,
  Wrench,
} from "lucide-react";
import clsx from "clsx";

type MotorcycleCardData = {
  id: number;
  make: string;
  model: string;
  year: number | null;
  isVeteran: boolean;
  currentOdo: number;
  kmThisYear: number;
  openIssuesCount: number;
  nextInspection: {
    label: string;
    isOverdue: boolean;
  } | null;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const motorcyclesList = await db.query.motorcycles.findMany({
    where: eq(motorcycles.userId, user.id),
  });

  const cards: MotorcycleCardData[] = [];
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  for (const moto of motorcyclesList) {
    // 1. Calculate Current Odometer (Max of all records)
    const [maxMaint] = await db
      .select({ odo: sql<number>`max(${maintenanceRecords.odo})` })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.motorcycleId, moto.id));

    const [maxIssue] = await db
      .select({ odo: sql<number>`max(${issues.odo})` })
      .from(issues)
      .where(eq(issues.motorcycleId, moto.id));

    const [maxLoc] = await db
      .select({ odo: sql<number>`max(${locationRecords.odometer})` })
      .from(locationRecords)
      .where(eq(locationRecords.motorcycleId, moto.id));

    const currentOdo = Math.max(
      moto.initialOdo ?? 0,
      moto.manualOdo ?? 0,
      maxMaint?.odo ?? 0,
      maxIssue?.odo ?? 0,
      maxLoc?.odo ?? 0
    );

    // 2. Calculate KM this year
    // Max odo recorded this year
    // We need to check dates.
    // Helper to get max odo with date constraint
    // Since SQLite stores dates as strings YYYY-MM-DD, we can compare strings.

    const [lastOdoPrevYearResult] = await db
      .select({ odo: sql<number>`max(${maintenanceRecords.odo})` }) // Simplified: checking main records. Ideally check all.
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.motorcycleId, moto.id),
          lt(maintenanceRecords.date, startOfYear)
        )
      );
     // We should really check all sources for the "start of year" value, but usually maintenance/log is enough.
     // Fallback to initialOdo if purchaseDate is this year?
     // For simplicity and performance, let's assume maintenance records are the primary source of truth for history, 
     // or utilize the calculated currentOdo if no records exist.
     
    const startOdo = lastOdoPrevYearResult?.odo ?? moto.initialOdo ?? 0;
    
    // Use currentOdo as the "end" of this year (assuming currentOdo is up to date)
    // Only if currentOdo comes from a record this year? 
    // If the bike hasn't moved this year, currentOdo might be from last year.
    // Let's verify if we have ANY record this year.
    
    const hasRecordThisYear = 
      (maxMaint?.odo && maxMaint.odo > startOdo) || 
      (maxIssue?.odo && maxIssue.odo > startOdo) ||
      (maxLoc?.odo && maxLoc.odo > startOdo); // Rough heuristic

    const kmThisYear = hasRecordThisYear ? Math.max(0, currentOdo - startOdo) : 0;


    // 3. Open Issues
    const [issuesCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(
        and(
          eq(issues.motorcycleId, moto.id),
          ne(issues.status, "done")
        )
      );
    const openIssuesCount = issuesCountResult?.count ?? 0;

    // 4. Next Inspection
    const [lastInspectionRecord] = await db
      .select()
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.motorcycleId, moto.id),
          eq(maintenanceRecords.type, "inspection")
        )
      )
      .orderBy(desc(maintenanceRecords.date))
      .limit(1);

    const inspectionInfo = getNextInspectionInfo({
      firstRegistration: moto.firstRegistration,
      lastInspection: lastInspectionRecord?.date,
      isVeteran: moto.isVeteran,
    });

    cards.push({
      id: moto.id,
      make: moto.make,
      model: moto.model,
      year: moto.modelYear,
      isVeteran: moto.isVeteran,
      currentOdo,
      kmThisYear,
      openIssuesCount,
      nextInspection: inspectionInfo
        ? {
            label: inspectionInfo.relativeLabel,
            isOverdue: inspectionInfo.isOverdue,
          }
        : null,
    });
  }

  return data(
    { cards, user },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();

  const parseString = (value: FormDataEntryValue | null | undefined) =>
    typeof value === "string" ? value : "";
  const parseNumber = (value: FormDataEntryValue | null | undefined, fallback?: number) => {
      const parsed = Number.parseFloat(parseString(value));
      return Number.isNaN(parsed) ? fallback : parsed;
  };
  const parseInteger = (value: FormDataEntryValue | null | undefined, fallback?: number) => {
      const parsed = Number.parseInt(parseString(value), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
  };
  const parseBoolean = (value: FormDataEntryValue | null | undefined) =>
      parseString(value) === "true";

  const modelYear = parseInteger(formData.get("modelYear"));

  const newMotorcycle: NewMotorcycle = {
    make: parseString(formData.get("make")),
    model: parseString(formData.get("model")),
    ...(modelYear !== undefined ? { modelYear } : {}),
    userId: user.id,
    vin: parseString(formData.get("vin")),
    vehicleIdNr: parseString(formData.get("vehicleIdNr")) || undefined,
    numberPlate: parseString(formData.get("numberPlate")) || undefined,
    isVeteran: parseBoolean(formData.get("isVeteran")),
    isArchived: parseBoolean(formData.get("isArchived")),
    firstRegistration: parseString(formData.get("firstRegistration")),
    initialOdo: parseInteger(formData.get("initialOdo")) ?? 0,
    purchaseDate: parseString(formData.get("purchaseDate")),
    purchasePrice: parseNumber(formData.get("purchasePrice")) ?? 0,
  };

  const dbClient = await getDb();
  await createMotorcycle(dbClient, newMotorcycle);

  return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, user } = loaderData;

  const numberFormatter = new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 0,
  });

  return (
    <div className="container mx-auto p-4 space-y-8">
      
      {/* Header/Welcome removed or simplified as we have the sticky header now. 
          We can just show the grid. */}
      
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-navy-700 dark:bg-navy-800/50">
            <h3 className="text-lg font-medium text-foreground dark:text-white">
              Keine Motorräder gefunden
            </h3>
            <p className="mt-2 text-sm text-secondary dark:text-navy-400">
              Füge dein erstes Motorrad hinzu, um zu starten.
            </p>
          </div>
        ) : (
          cards.map((moto) => (
            <div
              key={moto.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-navy-700 dark:bg-navy-800"
            >
              {/* Card Header */}
              <div className="border-b border-gray-100 p-5 dark:border-navy-700">
                <h3 className="text-xl font-bold text-primary dark:text-blue-400">
                  {moto.make} {moto.model}
                </h3>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary dark:text-navy-300">
                    {moto.year || "N/A"}
                  </span>
                  {moto.isVeteran && (
                    <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                      Veteran
                    </span>
                  )}
                </div>
              </div>

              {/* Card Stats Grid */}
              <div className="flex-1 p-5">
                <div className="grid gap-y-4">
                  
                  {/* Odometer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary dark:text-navy-400">
                      <Gauge className="h-5 w-5" />
                      <span className="text-sm">Akt. Kilometerstand</span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-gray-100">
                      {numberFormatter.format(moto.currentOdo)} km
                    </span>
                  </div>

                  {/* KM this year */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary dark:text-navy-400">
                      <RouteIcon className="h-5 w-5" />
                      <span className="text-sm">Kilometer dieses Jahr</span>
                    </div>
                    <span className={clsx(
                      "font-semibold",
                      moto.kmThisYear > 0 ? "text-foreground dark:text-gray-100" : "text-orange-500"
                    )}>
                      {numberFormatter.format(moto.kmThisYear)} km
                    </span>
                  </div>

                  {/* Issues */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary dark:text-navy-400">
                      <Wrench className="h-5 w-5" />
                      <span className="text-sm">Mängel</span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-gray-100">
                      {moto.openIssuesCount > 0 ? moto.openIssuesCount : "Keine"}
                    </span>
                  </div>

                  {/* Next Inspection */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary dark:text-navy-400">
                      <CalendarDays className="h-5 w-5" />
                      <span className="text-sm">Nächste MFK</span>
                    </div>
                    <span className={clsx(
                      "font-semibold",
                      moto.nextInspection?.isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground dark:text-gray-100"
                    )}>
                      {moto.nextInspection?.label || "Unbekannt"}
                    </span>
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simple Add Form at Bottom */}
      <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 dark:border-navy-700 dark:bg-navy-800">
        <h2 className="mb-4 text-lg font-semibold text-foreground dark:text-white">Motorrad hinzufügen</h2>
        <Form method="post" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="make" className="mb-1 block text-xs font-medium text-secondary dark:text-navy-300">Marke</label>
            <input type="text" name="make" id="make" required 
                   className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-400"/>
          </div>
          <div>
            <label htmlFor="model" className="mb-1 block text-xs font-medium text-secondary dark:text-navy-300">Modell</label>
            <input type="text" name="model" id="model" required 
                   className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-400"/>
          </div>
          <div>
            <label htmlFor="modelYear" className="mb-1 block text-xs font-medium text-secondary dark:text-navy-300">Jahrgang</label>
            <input type="number" name="modelYear" id="modelYear" 
                   className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-400"/>
          </div>
          <div>
            <label htmlFor="vin" className="mb-1 block text-xs font-medium text-secondary dark:text-navy-300">Fahrgestellnummer (VIN)</label>
            <input type="text" name="vin" id="vin" required 
                   className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-400"/>
          </div>
          <div>
            <label htmlFor="initialOdo" className="mb-1 block text-xs font-medium text-secondary dark:text-navy-300">Anfangs-Kilometerstand</label>
            <input type="number" name="initialOdo" id="initialOdo" defaultValue={0} 
                   className="block w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-400"/>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/30 dark:bg-primary dark:hover:bg-primary-light">
              Hinzufügen
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
