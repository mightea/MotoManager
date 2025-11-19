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
import { eq } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import { buildDashboardData, type MotorcycleDashboardItem } from "~/utils/home-stats";
import {
  CalendarDays,
  Gauge,
  Route as RouteIcon,
  Wrench,
} from "lucide-react";
import clsx from "clsx";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const motorcyclesList = await db.query.motorcycles.findMany({
    where: eq(motorcycles.userId, user.id),
  });

  // Fetch all related data for calculations
  // Note: Ideally we should filter these by motorcycle IDs, but for now we fetch all and filter in memory
  // via the buildDashboardData utility which ensures only relevant data is used.
  const allIssues = await db.query.issues.findMany();
  const allMaintenance = await db.query.maintenanceRecords.findMany();
  const allLocations = await db.query.locationRecords.findMany();

  const { items: cards } = buildDashboardData({
    motorcycles: motorcyclesList,
    issues: allIssues,
    maintenance: allMaintenance,
    locationHistory: allLocations,
    year: new Date().getFullYear(),
  });

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
                    {moto.modelYear || "N/A"}
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
                      {numberFormatter.format(moto.odometer)} km
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
                      moto.odometerThisYear > 0 ? "text-foreground dark:text-gray-100" : "text-orange-500"
                    )}>
                      {numberFormatter.format(moto.odometerThisYear)} km
                    </span>
                  </div>

                  {/* Issues */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary dark:text-navy-400">
                      <Wrench className="h-5 w-5" />
                      <span className="text-sm">Mängel</span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-gray-100">
                      {moto.numberOfIssues > 0 ? moto.numberOfIssues : "Keine"}
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
                      {moto.nextInspection?.relativeLabel || "Unbekannt"}
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