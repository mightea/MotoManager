import { useId, useState } from "react";
import { data, Link } from "react-router";
import type { Route } from "./+types/motorcycle.detail";
import { getDb } from "~/db";
import { issues, maintenanceRecords, motorcycles } from "~/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import { ArrowLeft, ChevronDown, Wrench } from "lucide-react";
import clsx from "clsx";
import OpenIssuesCard from "~/components/open-issues-card";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();
  
  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = parseInt(params.id, 10);

  if (isNaN(motorcycleId)) {
    throw new Response("Invalid Motorcycle ID", { status: 400 });
  }

  const motorcycle = await db.query.motorcycles.findFirst({
    where: eq(motorcycles.id, motorcycleId),
  });

  if (!motorcycle) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  if (motorcycle.userId !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const openIssues = await db.query.issues.findMany({
    where: and(eq(issues.motorcycleId, motorcycleId), ne(issues.status, "done")),
    orderBy: [desc(issues.priority), desc(issues.date)],
  });

  const maintenanceHistory = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.motorcycleId, motorcycleId),
    orderBy: [desc(maintenanceRecords.date)],
  });

  return data(
    { motorcycle, user, openIssues, maintenanceHistory },
    { headers: mergeHeaders(headers ?? {}) }
  );
}

export default function MotorcycleDetail({ loaderData }: Route.ComponentProps) {
  const { motorcycle, openIssues, maintenanceHistory } = loaderData;
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const detailsPanelId = useId();

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  const currencyFormatter = new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: motorcycle.currencyCode || "CHF",
  });

  const detailEntries = [
    {
      label: "Kennzeichen",
      value: motorcycle.numberPlate?.trim() || null,
    },
    {
      label: "Stammnummer",
      value: motorcycle.vehicleIdNr?.trim() || null,
    },
    {
      label: "1. Inverkehrsetzung",
      value: motorcycle.firstRegistration
        ? dateFormatter.format(new Date(motorcycle.firstRegistration))
        : null,
    },
    {
      label: "Kaufdatum",
      value: motorcycle.purchaseDate
        ? dateFormatter.format(new Date(motorcycle.purchaseDate))
        : null,
    },
    {
      label: "Kaufpreis",
      value:
        motorcycle.purchasePrice !== null && motorcycle.purchasePrice !== undefined
          ? currencyFormatter.format(motorcycle.purchasePrice)
          : null,
    },
    {
      label: "Status",
      value: `${motorcycle.isArchived ? "Archiviert" : "Aktiv"}${
        motorcycle.isVeteran ? " • Veteran" : ""
      }`,
    },
  ];

  const visibleDetails = detailEntries.filter(
    (entry) => entry.value !== null && entry.value !== ""
  );

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-gray-50 dark:bg-navy-800 dark:hover:bg-navy-700"
        >
          <ArrowLeft className="h-5 w-5 text-secondary dark:text-navy-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">
            {motorcycle.make} {motorcycle.model}
          </h1>
          <p className="text-sm text-secondary dark:text-navy-400">
            {motorcycle.modelYear ? `Jahrgang ${motorcycle.modelYear}` : "Jahrgang unbekannt"} • {motorcycle.vin}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Basic Info Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
          <button
            type="button"
            onClick={() => setDetailsExpanded((prev) => !prev)}
            className="mb-1 flex w-full items-center justify-between text-left text-base font-semibold text-foreground transition-colors hover:text-primary dark:text-white"
            aria-expanded={detailsExpanded}
            aria-controls={detailsPanelId}
          >
            <span>Fahrzeugdaten</span>
            <ChevronDown
              className={clsx("h-5 w-5 transition-transform", {
                "rotate-180": detailsExpanded,
              })}
            />
          </button>
          <div id={detailsPanelId} hidden={!detailsExpanded}>
            {visibleDetails.length > 0 ? (
              <dl className="mt-3 space-y-2 text-sm">
                {visibleDetails.map((entry) => (
                  <div key={entry.label} className="flex justify-between">
                    <dt className="text-secondary dark:text-navy-400">{entry.label}</dt>
                    <dd className="font-medium text-foreground dark:text-gray-200">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-secondary dark:text-navy-400">
                Keine Fahrzeugdaten vorhanden.
              </p>
            )}
          </div>
        </div>
        
        <OpenIssuesCard
          issues={openIssues}
          dateFormatter={dateFormatter}
          className="md:col-span-2"
        />
      </div>
      
      {/* Maintenance History Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground dark:text-white">Wartungshistorie</h2>
          </div>
          {maintenanceHistory.length === 0 ? (
              <p className="text-sm text-secondary dark:text-navy-400">Keine Wartungseinträge vorhanden.</p>
          ) : (
              <ul className="space-y-2">
                  {maintenanceHistory.map((maintenance) => (
                      <li key={maintenance.id} className="flex items-center gap-3">
                          <Wrench className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                              <p className="font-medium text-foreground dark:text-gray-200">{maintenance.description || maintenance.type}</p>
                              <p className="text-xs text-secondary dark:text-navy-400">
                                {maintenance.date ? dateFormatter.format(new Date(maintenance.date)) : "Datum unbekannt"} • {maintenance.odo} km
                                {maintenance.cost && ` • ${currencyFormatter.format(maintenance.cost)}`}
                              </p>
                          </div>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                            {maintenance.type}
                          </span>
                      </li>
                  ))}
              </ul>
          )}
      </div>
    </div>
  );
}
