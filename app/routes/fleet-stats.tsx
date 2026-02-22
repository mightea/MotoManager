import { data, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/fleet-stats";
import { getDb } from "~/db";
import { motorcycles, issues, maintenanceRecords, locationRecords } from "~/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "~/services/auth.server";
import { calculateFleetStats } from "~/utils/fleet-stats";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import { BarChart3, TrendingUp, Wallet, Bike, ArrowLeft, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useState, Fragment, useRef, useEffect } from "react";

export function meta() {
  return [
    { title: "Statistiken - Moto Manager" },
    { name: "description", content: "Detaillierte Statistiken über deine Motorrad-Flotte über die Jahre." },
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

function ChartSection({
  title,
  icon: Icon,
  data,
  maxValue,
  valueKey,
  unit,
  isCurrency = false,
  colorClass,
  iconBgClass
}: {
  title: string;
  icon: any;
  data: any[];
  maxValue: number;
  valueKey: string;
  unit: string;
  isCurrency?: boolean;
  colorClass: string;
  iconBgClass: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reversedData = [...data].reverse();
  const showEveryNthYear = data.length > 15 ? 5 : (data.length > 8 ? 2 : 1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={clsx("rounded-lg p-2", iconBgClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground dark:text-white">{title}</h2>
      </div>

      <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
        {/* Grid Lines */}
        <div className="absolute inset-x-6 bottom-14 top-6 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-t border-gray-100 dark:border-navy-700/50" />
          ))}
        </div>

        <div 
          ref={scrollRef}
          className="overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar"
        >
          <div className="relative flex h-32 items-end gap-1.5 sm:gap-3 min-w-[max-content]">
            {reversedData.map((year, idx) => {
              const value = (year as any)[valueKey] || 0;
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const showLabel = (year.year % showEveryNthYear === 0) || idx === 0 || idx === reversedData.length - 1;

              return (
                <div key={year.year} className="group relative flex-1 flex flex-col items-center h-full justify-end min-w-[2.5rem] sm:min-w-[3.5rem]">
                  <div
                    className={clsx("w-full rounded-t-sm transition-all relative z-10", colorClass)}
                    style={{ height: `${Math.max(percentage, value > 0 ? 2 : 0)}%` }}
                  >
                    {/* Tooltip-like Label */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 dark:bg-navy-600 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap z-20 shadow-xl">
                      {isCurrency ? formatCurrency(value) : `${formatNumber(value)}${unit}`}
                    </div>
                  </div>
                  <div className={clsx(
                    "mt-3 text-[10px] font-bold transition-colors",
                    showLabel ? "text-secondary dark:text-navy-400" : "text-transparent"
                  )}>
                    {year.year}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function YearlyDetails({ yearStats }: { yearStats: any }) {
  return (
    <div className="p-6 bg-gray-50/50 dark:bg-navy-900/30 border-t border-gray-100 dark:border-navy-700 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Motorcycles Summary */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-secondary dark:text-navy-500">Fahrzeuge in {yearStats.year}</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {yearStats.motorcycles.map((m: any) => (
            <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-700 dark:bg-navy-800">
              <div className="font-bold text-foreground dark:text-white mb-2">{m.make} {m.model}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[10px] uppercase font-bold text-secondary dark:text-navy-500">Distanz</div>
                  <div className="font-medium">{formatNumber(m.distance)} km</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-secondary dark:text-navy-500">Kosten</div>
                  <div className="font-medium">{formatCurrency(m.cost)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FleetStatsPage() {
  const { stats } = useLoaderData<typeof loader>();
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const activeYearlyStats = stats.yearly.filter(y => y.distance > 0 || y.cost > 0);

  if (activeYearlyStats.length === 0) {
    return (
      <div className="container mx-auto p-4 space-y-6 pt-28 pb-20 text-center">
        <h1 className="text-3xl font-bold">Statistiken</h1>
        <p className="text-secondary">Noch keine Daten vorhanden, um Statistiken anzuzeigen.</p>
        <Link to="/" className="text-primary hover:underline">Zurück zur Übersicht</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-10 pt-4 pb-24 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-secondary transition-colors hover:border-primary hover:text-primary dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Statistiken</h1>
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
      <div className="space-y-8">
        <ChartSection
          title="Anzahl Motorräder"
          icon={Bike}
          data={stats.yearly}
          maxValue={stats.overall.maxYearlyCount}
          valueKey="motorcycleCount"
          unit=""
          colorClass="bg-amber-500 hover:bg-amber-400"
          iconBgClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />

        <ChartSection
          title="Fahrleistung"
          icon={BarChart3}
          data={stats.yearly}
          maxValue={stats.overall.maxYearlyDistance}
          valueKey="distance"
          unit=" km"
          colorClass="bg-indigo-500 hover:bg-indigo-400"
          iconBgClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
        />

        <ChartSection
          title="Unterhaltskosten"
          icon={Wallet}
          data={stats.yearly}
          maxValue={stats.overall.maxYearlyCost}
          valueKey="cost"
          unit=""
          isCurrency
          colorClass="bg-emerald-500 hover:bg-emerald-400"
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
        />

        {/* Yearly Data Table */}
        <section className="space-y-6 pb-10">
          <h2 className="text-xl font-bold text-foreground dark:text-white px-1">Jahresübersicht</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-secondary dark:bg-navy-900 dark:text-navy-300">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Jahr</th>
                    <th className="hidden sm:table-cell px-6 py-4 font-bold tracking-wider text-right">Motorräder</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Distanz</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Kosten</th>
                    <th className="hidden sm:table-cell px-6 py-4 font-bold tracking-wider text-right">Ø Kosten/km</th>
                    <th className="px-6 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                  {activeYearlyStats.map((year) => {
                    const avgCostPerKm = year.distance > 0 ? year.cost / year.distance : 0;
                    const isExpanded = expandedYear === year.year;
                    return (
                      <Fragment key={year.year}>
                        <tr 
                          className={clsx(
                            "group cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-navy-700/50",
                            isExpanded && "bg-gray-50/80 dark:bg-navy-700/30"
                          )}
                          onClick={() => toggleYear(year.year)}
                        >
                          <td className="px-6 py-4 font-bold text-foreground dark:text-white">
                            {year.year}
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 text-right text-secondary dark:text-navy-300 tabular-nums">
                            {year.motorcycleCount}
                          </td>
                          <td className="px-6 py-4 text-right text-foreground dark:text-white font-medium tabular-nums">
                            {formatNumber(year.distance)} km
                          </td>
                          <td className="px-6 py-4 text-right text-foreground dark:text-white font-medium tabular-nums">
                            {formatCurrency(year.cost)}
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 text-right text-secondary dark:text-navy-400 tabular-nums">
                            {year.distance > 0 ? formatCurrency(avgCostPerKm) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronDown className={clsx(
                              "h-4 w-4 text-secondary transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <YearlyDetails yearStats={year} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
