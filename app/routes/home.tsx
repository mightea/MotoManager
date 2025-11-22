import { Form, Link, data, useLoaderData, useSearchParams } from "react-router";
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
import { userPrefs } from "~/services/preferences.server";
import { buildDashboardData, type MotorcycleDashboardItem } from "~/utils/home-stats";
import {
  CalendarDays,
  Gauge,
  Route as RouteIcon,
  Wrench,
  Plus,
  Clock,
  Tag,
  Calendar,
  ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";

export async function loader({ request }: Route.LoaderArgs) {
  // ... existing loader logic ...
  const { user, headers: authHeaders } = await requireUser(request);
  const db = await getDb();

  const motorcyclesList = await db.query.motorcycles.findMany({
    where: eq(motorcycles.userId, user.id),
  });

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

  // Sorting Logic
  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort");
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await userPrefs.parse(cookieHeader)) || {};
  const currentSort = sortParam || cookie.sort || "updated";

  cards.sort((a, b) => {
    switch (currentSort) {
      case "age":
        const dateA = a.firstRegistration ? new Date(a.firstRegistration).getTime() : (a.modelYear ? new Date(`${a.modelYear}-01-01`).getTime() : Number.MAX_SAFE_INTEGER);
        const dateB = b.firstRegistration ? new Date(b.firstRegistration).getTime() : (b.modelYear ? new Date(`${b.modelYear}-01-01`).getTime() : Number.MAX_SAFE_INTEGER);
        return dateA - dateB;
      case "make":
        return a.make.localeCompare(b.make) || a.model.localeCompare(b.model);
      case "inspection":
        const insA = a.nextInspection?.dueDateISO ? new Date(a.nextInspection.dueDateISO).getTime() : Number.MAX_SAFE_INTEGER;
        const insB = b.nextInspection?.dueDateISO ? new Date(b.nextInspection.dueDateISO).getTime() : Number.MAX_SAFE_INTEGER;
        return insA - insB;
      case "updated":
      default:
        const actA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const actB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return actB - actA;
    }
  });

  const headers = new Headers(authHeaders);
  if (sortParam) {
    headers.append("Set-Cookie", await userPrefs.serialize({ ...cookie, sort: sortParam }));
  }

  return data(
    { cards, user, currentSort },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  // ... existing action logic ...
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
    currencyCode: parseString(formData.get("currencyCode")),
  };

  const dbClient = await getDb();
  await createMotorcycle(dbClient, newMotorcycle);

  return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, user, currentSort } = loaderData;
  const [isAddOpen, setIsAddOpen] = useState(false);

  const numberFormatter = new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 0,
  });

  const sortOptions = [
    { id: "updated", label: "Aktualität", icon: Clock },
    { id: "make", label: "Marke", icon: Tag },
    { id: "age", label: "Alter", icon: Calendar },
    { id: "inspection", label: "MFK", icon: CalendarDays },
  ];
  
  const activeSortLabel = sortOptions.find(o => o.id === currentSort)?.label || "Sortieren";

  return (
    <div className="container mx-auto p-4 space-y-6 pb-24">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        {/* Sort Dropdown */}
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="inline-flex items-center justify-center gap-x-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-secondary shadow-sm hover:bg-gray-50 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700">
                {activeSortLabel}
                <ChevronDown className="h-4 w-4 text-secondary/70 dark:text-navy-400" aria-hidden="true" />
            </MenuButton>

            <MenuItems
                transition
                className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in dark:border-navy-700 dark:bg-navy-800 dark:ring-white/10"
            >
                {sortOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = currentSort === option.id;
                    return (
                        <MenuItem key={option.id}>
                            <Link
                                to={`?sort=${option.id}`}
                                className={clsx(
                                    "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                                    isActive 
                                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light" 
                                        : "text-secondary hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                                )}
                            >
                                <Icon className={clsx("h-4 w-4", isActive ? "text-primary dark:text-primary-light" : "text-secondary/70 dark:text-navy-400")} />
                                {option.label}
                            </Link>
                        </MenuItem>
                    );
                })}
            </MenuItems>
        </Menu>

        <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
        >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Neues Motorrad</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.length === 0 ? (
          <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center dark:border-navy-700 dark:bg-navy-800/50">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gray-100 dark:bg-navy-700">
               <Gauge className="h-8 w-8 text-gray-400 dark:text-navy-300" />
            </div>
            <h3 className="text-xl font-semibold text-foreground dark:text-white">
              Keine Motorräder gefunden
            </h3>
            <p className="mt-2 max-w-sm text-secondary dark:text-navy-400">
              Deine Garage ist leer. Füge dein erstes Motorrad hinzu, um Wartungen und Kilometerstände zu verwalten.
            </p>
            <button 
              onClick={() => setIsAddOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-all hover:bg-primary-dark active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Motorrad hinzufügen
            </button>
          </div>
        ) : (
          cards.map((moto) => (
            <div
              key={moto.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-navy-700 dark:bg-navy-800"
            >
              {/* Card Header */}
              <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-navy-700 dark:bg-navy-900/30">
                <div className="flex items-start justify-between">
                    <div>
                        <Link 
                          to={`/motorcycle/${moto.make.toLowerCase().replace(/\s+/g, '-')}-${moto.model.toLowerCase().replace(/\s+/g, '-')}/${moto.id}`}
                          className="group-hover:underline decoration-primary/50 underline-offset-4"
                        >
                          <h3 className="text-lg font-bold tracking-tight text-foreground dark:text-white">
                            {moto.make} {moto.model}
                          </h3>
                        </Link>
                        <p className="text-xs font-medium text-secondary dark:text-navy-400">
                            {moto.modelYear || "Jahrgang unbekannt"}
                        </p>
                    </div>
                    {moto.isVeteran && (
                        <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-orange-900/20 dark:text-orange-400">
                          Veteran
                        </span>
                    )}
                </div>
              </div>

              {/* Card Stats Grid */}
              <div className="flex-1 p-4">
                <div className="space-y-3">
                  
                  {/* Odometer */}
                  <div className="flex items-center justify-between rounded-xl bg-gray-50/50 p-2 dark:bg-navy-900/30">
                    <div className="flex items-center gap-2 text-secondary dark:text-navy-400">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-white text-primary shadow-sm dark:bg-navy-800 dark:text-primary-light">
                          <Gauge className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Aktuell</span>
                    </div>
                    <span className="text-sm font-bold text-foreground dark:text-gray-100">
                      {numberFormatter.format(moto.odometer)} km
                    </span>
                  </div>

                  {/* KM this year */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-secondary dark:text-navy-400">
                      <RouteIcon className="h-4 w-4" />
                      <span className="text-sm">Dieses Jahr</span>
                    </div>
                    <span className={clsx(
                      "text-sm font-semibold",
                      moto.odometerThisYear > 0 ? "text-foreground dark:text-gray-100" : "text-secondary/70 dark:text-navy-500"
                    )}>
                      {numberFormatter.format(moto.odometerThisYear)} km
                    </span>
                  </div>

                  {/* Issues */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-secondary dark:text-navy-400">
                      <Wrench className="h-4 w-4" />
                      <span className="text-sm">Offene Mängel</span>
                    </div>
                    <span className={clsx(
                        "text-sm font-semibold",
                        moto.numberOfIssues > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                    )}>
                      {moto.numberOfIssues > 0 ? `${moto.numberOfIssues} Ausstehend` : "Alles gut"}
                    </span>
                  </div>

                  {/* Next Inspection */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-secondary dark:text-navy-400">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-sm">Nächste MFK</span>
                    </div>
                    <span className={clsx(
                      "text-sm font-semibold",
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

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Motorrad hinzufügen"
        description="Füge ein neues Fahrzeug zu deiner Garage hinzu."
      >
        <AddMotorcycleForm onSubmit={() => setIsAddOpen(false)} />
      </Modal>
    </div>
  );
}
