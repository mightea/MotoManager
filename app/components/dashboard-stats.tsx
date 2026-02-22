import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { DashboardStats as DashboardStatsType } from "~/utils/home-stats";


interface DashboardStatsProps {
    stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground dark:text-white">
                    Jahresstatistiken
                </h2>
                <p className="text-secondary dark:text-navy-300">
                    Aggregierte Kennzahlen deiner Flotte {stats.year}.
                </p>
            </div>

            {/* Horizontal scroll on mobile, grid on larger */}
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
                {/* Kilometer dieses Jahr */}
                <StatCard
                    label="KILOMETER DIESES JAHR"
                    value={`${formatNumber(stats.totalKmThisYear)} km`}
                    description={`Summe aller registrierten Fahrten ${stats.year}.`}
                    accent="primary"
                />

                {/* Kilometer insgesamt */}
                <StatCard
                    label="KILOMETER INSGESAMT"
                    value={`${formatNumber(stats.totalKmOverall)} km`}
                    description="Gesamter gemessener Kilometerstand aller Bikes."
                />

                {/* Aktive To-Dos */}
                <StatCard
                    label="AKTIVE TO-DOS"
                    value={stats.totalActiveIssues.toString()}
                    description="Noch offene Issues über alle Motorräder hinweg."
                    accent={stats.totalActiveIssues > 0 ? "warning" : undefined}
                />

                {/* Wartungskosten */}
                <StatCard
                    label={`WARTUNGSKOSTEN ${stats.year}`}
                    value={formatCurrency(stats.totalMaintenanceCostThisYear)}
                    description="Summe der erfassten Kosten im aktuellen Jahr."
                />

                {/* Veteranen-Bikes */}
                <StatCard
                    label="VETERANEN-BIKES"
                    value={stats.veteranCount.toString()}
                    description="Anzahl Motorräder mit Veteranen-Status."
                />

                {/* Fleissigstes Bike */}
                <StatCard
                    label="FLEISSIGSTES BIKE"
                    value={
                        stats.topRider
                            ? `${stats.topRider.make} ${stats.topRider.model}`
                            : "-"
                    }
                    description={
                        stats.topRider
                            ? `${formatNumber(stats.topRider.odometerThisYear)} km in ${stats.year}`
                            : "Keine Fahrten in diesem Jahr."
                    }
                    accent="primary"
                />
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    description,
    accent,
}: {
    label: string;
    value: string;
    description: string;
    accent?: "primary" | "warning";
}) {
    const accentBorder =
        accent === "primary"
            ? "border-t-primary dark:border-t-primary-light"
            : accent === "warning"
                ? "border-t-orange-500 dark:border-t-orange-400"
                : "border-t-transparent";

    return (
        <div className={`flex min-w-[200px] snap-start flex-col justify-between rounded-xl border border-gray-200 dark:border-navy-700 border-t-2 ${accentBorder} bg-gray-50/50 p-5 transition-shadow hover:shadow-md dark:bg-navy-800/50`}>
            <div>
                <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400">
                    {label}
                </dt>
                <dd className="mt-3 text-2xl font-bold text-foreground dark:text-gray-100">
                    {value}
                </dd>
            </div>
            <p className="mt-3 text-xs text-secondary dark:text-navy-300">
                {description}
            </p>
        </div>
    );
}
