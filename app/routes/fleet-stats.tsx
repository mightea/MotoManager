import { data, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/fleet-stats";
import { getDb } from "~/db";
import { motorcycles, issues, maintenanceRecords, locationRecords } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "~/services/auth.server";
import { calculateFleetStats } from "~/utils/fleet-stats";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import { BarChart3, TrendingUp, Wallet, Bike, ArrowLeft } from "lucide-react";

export function meta() {
  return [
    { title: "Flottenstatistik - Moto Manager" },
    { name: "description", content: "Statistiken über deine Motorrad-Flotte über die Jahre." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const db = await getDb();

  const motorcyclesList = await db.query.motorcycles.findMany({
    where: eq(motorcycles.userId, user.id),
  });

  const motoIds = motorcyclesList.map(m => m.id);

  const [allIssues, allMaintenance, allLocations] = await Promise.all([
    motoIds.length > 0
      ? db.query.issues.findMany({ where: inArray(issues.motorcycleId, motoIds) })
      : Promise.resolve([]),
    motoIds.length > 0
      ? db.query.maintenanceRecords.findMany({ where: inArray(maintenanceRecords.motorcycleId, motoIds) })
      : Promise.resolve([]),
    motoIds.length > 0
      ? db.query.locationRecords.findMany({ where: inArray(locationRecords.motorcycleId, motoIds) })
      : Promise.resolve([]),
  ]);

  const stats = calculateFleetStats(motorcyclesList, allMaintenance, allIssues, allLocations);

  return data({ stats });
}

export default function FleetStatsPage() {
  const { stats } = useLoaderData<typeof loader>();

  if (stats.yearly.length === 0) {
    return (
      <div className="container mx-auto p-4 space-y-6 pt-28 pb-20 text-center">
        <h1 className="text-3xl font-bold">Flottenstatistik</h1>
        <p className="text-secondary">Noch keine Daten vorhanden, um Statistiken anzuzeigen.</p>
        <Link to="/" className="text-primary hover:underline">Zurück zur Übersicht</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-10 pt-28 pb-24 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-secondary transition-colors hover:border-primary hover:text-primary dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Flottenstatistik</h1>
          <p className="text-secondary dark:text-navy-400">Entwicklung deiner Garage über die Jahre.</p>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
          <div className="flex items-center gap-3 text-indigo-500 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Gesamtdistanz</span>
          </div>
          <div className="text-3xl font-bold text-foreground dark:text-white tabular-nums">
            {formatNumber(stats.overall.totalDistance)} km
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Gesamtkosten</span>
          </div>
          <div className="text-3xl font-bold text-foreground dark:text-white tabular-nums">
            {formatCurrency(stats.overall.totalCost)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <Bike className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Aktueller Fuhrpark</span>
          </div>
          <div className="text-3xl font-bold text-foreground dark:text-white tabular-nums">
            {stats.yearly[0]?.motorcycleCount || 0} Bikes
          </div>
        </div>
      </div>

      {/* Detailed Stats Table & Charts */}
      <div className="space-y-12">
        {/* Distance Chart */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-white">Fahrleistung pro Jahr</h2>
          </div>
          
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800 overflow-hidden">
            <div className="flex h-64 items-end gap-2 sm:gap-4 px-2">
              {[...stats.yearly].reverse().map((year) => (
                <div key={year.year} className="group relative flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-indigo-500 rounded-t-lg transition-all hover:bg-indigo-400 relative"
                    style={{ height: `${(year.distance / stats.overall.maxYearlyDistance) * 100}%`, minHeight: year.distance > 0 ? '4px' : '0px' }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap z-10">
                      {formatNumber(year.distance)} km
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-bold text-secondary dark:text-navy-400 rotate-45 sm:rotate-0">
                    {year.year}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cost Chart */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-white">Unterhaltskosten pro Jahr</h2>
          </div>
          
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800 overflow-hidden">
            <div className="flex h-64 items-end gap-2 sm:gap-4 px-2">
              {[...stats.yearly].reverse().map((year) => (
                <div key={year.year} className="group relative flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-emerald-500 rounded-t-lg transition-all hover:bg-emerald-400 relative"
                    style={{ height: `${(year.cost / stats.overall.maxYearlyCost) * 100}%`, minHeight: year.cost > 0 ? '4px' : '0px' }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap z-10">
                      {formatCurrency(year.cost)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-bold text-secondary dark:text-navy-400 rotate-45 sm:rotate-0">
                    {year.year}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Yearly Data Table */}
        <section className="space-y-6 pb-10">
          <h2 className="text-xl font-bold text-foreground dark:text-white px-1">Jahresübersicht</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-secondary dark:bg-navy-900 dark:text-navy-300">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Jahr</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Motorräder</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Distanz</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Kosten</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Ø Kosten/km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                {stats.yearly.map((year) => {
                  const avgCostPerKm = year.distance > 0 ? year.cost / year.distance : 0;
                  return (
                    <tr key={year.year} className="group hover:bg-gray-50 dark:hover:bg-navy-700/50">
                      <td className="px-6 py-4 font-bold text-foreground dark:text-white">
                        {year.year}
                      </td>
                      <td className="px-6 py-4 text-right text-secondary dark:text-navy-300 tabular-nums">
                        {year.motorcycleCount}
                      </td>
                      <td className="px-6 py-4 text-right text-foreground dark:text-white font-medium tabular-nums">
                        {formatNumber(year.distance)} km
                      </td>
                      <td className="px-6 py-4 text-right text-foreground dark:text-white font-medium tabular-nums">
                        {formatCurrency(year.cost)}
                      </td>
                      <td className="px-6 py-4 text-right text-secondary dark:text-navy-400 tabular-nums">
                        {year.distance > 0 ? formatCurrency(avgCostPerKm) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
