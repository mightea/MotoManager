import { data, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/fleet-stats";
import { requireUser } from "~/services/auth";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import { BarChart3, TrendingUp, Wallet, Bike, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useState, Fragment, useRef, useEffect } from "react";
import { fetchFromBackend } from "~/utils/backend";
import { EmptyState } from "~/components/empty-state";

export function meta() {
  return [
    { title: "Statistiken - Moto Manager" },
    { name: "description", content: "Detaillierte Statistiken über deine Motorrad-Flotte über die Jahre." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const response = await fetchFromBackend<any>("/stats", {}, token);

  return data({ stats: response.stats });
}

type ChartTone = "primary" | "secondary" | "workshop";

const TONE_TEXT: Record<ChartTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  workshop: "text-[var(--color-workshop)]",
};

function ChartSection({
  title,
  icon: Icon,
  data,
  maxValue,
  valueKey,
  unit,
  isCurrency = false,
  colorClass,
  tone,
}: {
  title: string;
  icon: any;
  data: any[];
  maxValue: number;
  valueKey: string;
  unit: string;
  isCurrency?: boolean;
  colorClass: string;
  tone: ChartTone;
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
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className={clsx("h-4 w-4 shrink-0", TONE_TEXT[tone])} aria-hidden="true" />
        <h2 className="font-subdisplay text-sm text-base-content dark:text-white">{title}</h2>
      </div>

      <div className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        {/* Grid Lines */}
        <div className="absolute inset-x-6 bottom-14 top-6 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full border-t border-base-200 dark:border-navy-700/50" />
          ))}
        </div>

        <div
          ref={scrollRef}
          className="overflow-x-auto pb-2 -mx-2 px-2"
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
                    {/* Tooltip — workshop tag style */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform rounded-sm bg-base-content px-2 py-1 font-numeric text-[10px] font-semibold tabular-nums text-base-100 whitespace-nowrap z-20 shadow-[0_8px_18px_-10px_rgba(15,23,42,0.5)]">
                      {isCurrency ? formatCurrency(value) : `${formatNumber(value)}${unit}`}
                    </div>
                  </div>
                  <div className={clsx(
                    "mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums transition-colors",
                    showLabel ? "text-base-content/55 dark:text-navy-400" : "text-transparent",
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

function SummaryCard({
  icon: Icon,
  tone,
  label,
  value,
  subline,
}: {
  icon: any;
  tone: ChartTone;
  label: string;
  value: string;
  subline?: string;
}) {
  return (
    <div className="relative rounded-sm border border-base-300/70 bg-base-100 p-5 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
      <div className={clsx("flex items-center gap-2 mb-2", TONE_TEXT[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <div className="font-numeric text-3xl font-semibold tabular-nums leading-none text-base-content dark:text-white">
        {value}
      </div>
      {subline && (
        <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
          {subline}
        </p>
      )}
    </div>
  );
}

function YearlyDetails({ yearStats }: { yearStats: any }) {
  return (
    <div className="space-y-3 border-t border-base-200 bg-base-200/40 p-5 animate-fade-in dark:border-navy-700 dark:bg-navy-900/30">
      <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
        Fahrzeuge in {yearStats.year}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {yearStats.motorcycles.map((m: any) => (
          <div key={m.id} className="rounded-sm border border-base-300/70 bg-base-100 p-3 shadow-[0_1px_0_0_rgba(15,23,42,0.03)] dark:border-navy-700 dark:bg-navy-800">
            <div className="font-subdisplay text-sm text-base-content dark:text-white mb-2 truncate">
              {m.make} {m.model}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-500">
                  Distanz
                </div>
                <div className="font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-gray-100">
                  {formatNumber(m.distance)} km
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-500">
                  Kosten
                </div>
                <div className="font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-gray-100">
                  {formatCurrency(m.cost)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FleetStatsPage() {
  const { stats } = useLoaderData<typeof clientLoader>();
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const activeYearlyStats = (Array.isArray(stats?.yearly) ? stats.yearly : []).filter((y: any) => y.distance > 0 || y.cost > 0);

  if (activeYearlyStats.length === 0) {
    return (
      <div className="container mx-auto px-4 pt-3 pb-24">
        <EmptyState
          icon={BarChart3}
          title="Noch keine Statistiken"
          description="Sobald Wartungs- oder Tank-Einträge vorhanden sind, erscheinen hier deine Flotten-Statistiken."
          action={
            <Link
              to="/"
              className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
            >
              Zur Übersicht
              <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 pt-3 pb-24 animate-fade-in md:p-6 md:space-y-8">
      {/* Overall Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={TrendingUp}
          tone="primary"
          label="Gesamtdistanz"
          value={`${formatNumber(stats.overall.totalDistance)} km`}
        />
        <SummaryCard
          icon={Wallet}
          tone="secondary"
          label="Gesamtkosten"
          value={formatCurrency(stats.overall.totalCost)}
          subline={
            stats.yearly[0]?.motorcycleCount > 0
              ? `Ø ${formatCurrency(stats.overall.totalCost / stats.yearly[0].motorcycleCount)} pro Motorrad`
              : undefined
          }
        />
        <SummaryCard
          icon={Bike}
          tone="workshop"
          label="Aktueller Fuhrpark"
          value={`${stats.yearly[0]?.motorcycleCount || 0} Bikes`}
        />
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
          colorClass="bg-[var(--color-workshop)] hover:bg-[var(--color-workshop)]/85"
          tone="workshop"
        />

        <ChartSection
          title="Fahrleistung"
          icon={BarChart3}
          data={stats.yearly}
          maxValue={stats.overall.maxYearlyDistance}
          valueKey="distance"
          unit=" km"
          colorClass="bg-primary hover:bg-primary/85"
          tone="primary"
        />

        <ChartSection
          title="Unterhaltskosten"
          icon={Wallet}
          data={stats.yearly}
          maxValue={stats.overall.maxYearlyCost}
          valueKey="cost"
          unit=""
          isCurrency
          colorClass="bg-secondary hover:bg-secondary/85"
          tone="secondary"
        />

        {/* Yearly Data Table */}
        <section className="space-y-3 pb-6">
          <h2 className="font-subdisplay text-sm text-base-content dark:text-white">Jahresübersicht</h2>
          <div className="overflow-hidden rounded-sm border border-base-300/70 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-base-200 bg-base-200/50 dark:border-navy-700 dark:bg-navy-900/50">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-300">Jahr</th>
                    <th className="hidden sm:table-cell px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-300 text-right">Motorräder</th>
                    <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-300 text-right">Distanz</th>
                    <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-300 text-right">Kosten</th>
                    <th className="hidden sm:table-cell px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-300 text-right">Ø Kosten/km</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 dark:divide-navy-700">
                  {activeYearlyStats.map((year: any) => {
                    const avgCostPerKm = year.distance > 0 ? year.cost / year.distance : 0;
                    const isExpanded = expandedYear === year.year;
                    return (
                      <Fragment key={year.year}>
                        <tr
                          className={clsx(
                            "group cursor-pointer transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/40",
                            isExpanded && "bg-base-200/40 dark:bg-navy-700/30",
                          )}
                          onClick={() => toggleYear(year.year)}
                        >
                          <td className="px-4 py-3 font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-white">
                            {year.year}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-right font-numeric text-sm tabular-nums text-base-content/70 dark:text-navy-300">
                            {year.motorcycleCount}
                          </td>
                          <td className="px-4 py-3 text-right font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-white">
                            {formatNumber(year.distance)} km
                          </td>
                          <td className="px-4 py-3 text-right font-numeric text-sm font-semibold tabular-nums text-base-content dark:text-white">
                            {formatCurrency(year.cost)}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-right font-numeric text-sm tabular-nums text-base-content/65 dark:text-navy-400">
                            {year.distance > 0 ? formatCurrency(avgCostPerKm) : '–'}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <ChevronDown className={clsx(
                              "h-4 w-4 text-base-content/45 transition-transform",
                              isExpanded && "rotate-180",
                            )} aria-hidden="true" />
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
