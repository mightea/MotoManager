import { Link, useLoaderData } from "react-router";
import { requireUser } from "~/services/auth";
import { formatNumber } from "~/utils/numberUtils";
import { ArrowLeft, Users, Bike, FileText, Wrench, AlertCircle, MapPin, History, PenTool, Link as LinkIcon } from "lucide-react";
import type { Route } from "./+types/settings.server-stats";
import clsx from "clsx";
import { fetchFromBackend } from "~/utils/backend";

export function meta() {
  return [
    { title: "Server Statistiken - Moto Manager" },
    { name: "description", content: "Globale Kennzahlen und Systemstatus der Instanz." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    const { token } = await requireUser(request);

    const response = await fetchFromBackend<any>("/stats", {}, token);

    const { stats, avgMotoPerUser, avgDocsPerUser } = response;

    return { stats: stats.global, avgMotoPerUser, avgDocsPerUser };
}

export default function ServerStats() {
    const { stats, avgMotoPerUser, avgDocsPerUser } = useLoaderData<typeof clientLoader>();

    return (
        <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pt-4 sm:pt-28 pb-20">
            <div className="flex items-center gap-4">
                <Link
                    to="/settings"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-secondary transition-colors hover:border-primary hover:text-primary dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-foreground dark:text-white">
                        Server Statistiken
                    </h1>
                    <p className="text-secondary dark:text-navy-300">
                        Globale Kennzahlen der MotoManager Instanz.
                    </p>
                </div>
            </div>

            <div className="space-y-10">
                {/* Section 1: Fleet */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground dark:text-gray-100">
                        Motorräder & Fuhrpark
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            icon={Bike}
                            label="Motorräder gesamt"
                            value={formatNumber(stats.motorcycles)}
                            description="Alle erfassten Motorräder"
                            color="indigo"
                        />
                        <StatCard
                            icon={Bike} // Or Archive icon if available
                            label="Archivierte Motorräder"
                            value={formatNumber(stats.archivedMotorcycles)}
                            description="Motorräder im Archivstatus"
                            color="indigo"
                        />
                        <StatCard
                            icon={Users} // Chart icon in screenshot, Users fits context
                            label="Ø Motorräder pro Nutzer"
                            value={formatNumber(avgMotoPerUser, 1)}
                            description="Verhältnis Fahrzeuge zu Nutzern"
                            color="indigo"
                        />
                    </div>
                </section>

                {/* Section 2: Documents */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground dark:text-gray-100">
                        Dokumente
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            icon={FileText}
                            label="Dokumente"
                            value={formatNumber(stats.documents)}
                            description="Gespeicherte PDF-Dateien"
                            color="blue"
                        />
                        <StatCard
                            icon={LinkIcon}
                            label="Zuordnungen"
                            value={formatNumber(stats.documentAssignments)}
                            description="Dokument-Motorrad Beziehungen"
                            color="blue"
                        />
                        <StatCard
                            icon={FileText} // Chart icon in screenshot
                            label="Ø Dokumente pro Nutzer"
                            value={formatNumber(avgDocsPerUser, 1)}
                            description="Verhältnis Dokumente zu Nutzern"
                            color="blue"
                        />
                    </div>
                </section>

                {/* Section 3: Operations */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground dark:text-gray-100">
                        Betrieb & Aktivitäten
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            icon={Wrench}
                            label="Historie"
                            value={formatNumber(stats.maintenance)}
                            description="Einträge in der Historie"
                            color="violet"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Offene Mängel"
                            value={formatNumber(stats.openIssues)}
                            description="Issues mit Status nicht erledigt"
                            color="violet"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Issues gesamt"
                            value={formatNumber(stats.issues)}
                            description="Alle erfassten Issues"
                            color="violet"
                        />
                    </div>
                </section>

                {/* Section 4: Infrastructure */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground dark:text-gray-100">
                        Infrastruktur
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            icon={MapPin}
                            label="Standorte"
                            value={formatNumber(stats.locations)}
                            description="Einzigartige Lagerorte"
                            color="emerald"
                        />
                        <StatCard
                            icon={History}
                            label="Standort-Historie"
                            value={formatNumber(stats.locationHistory)}
                            description="Erfasste Standortwechsel"
                            color="emerald"
                        />
                        <StatCard
                            icon={PenTool}
                            label="Drehmomentwerte"
                            value={formatNumber(stats.torqueSpecs)}
                            description="Hinterlegte Drehmomentspezifikationen"
                            color="emerald"
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    description,
    color = "indigo",
}: {
    icon: any;
    label: string;
    value: string;
    description: string;
    color?: "indigo" | "blue" | "violet" | "emerald";
}) {
    const colorMap = {
        indigo: "text-indigo-400 bg-indigo-500/10",
        blue: "text-blue-400 bg-blue-500/10",
        violet: "text-violet-400 bg-violet-500/10",
        emerald: "text-emerald-400 bg-emerald-500/10",
    };

    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-navy-700 dark:bg-navy-800">
            <div className="flex items-start justify-between">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground dark:text-gray-100">
                            {label}
                        </h3>
                        <p className="text-xs text-secondary dark:text-navy-400">
                            {description}
                        </p>
                    </div>
                    <p className="text-4xl font-bold text-foreground dark:text-white">
                        {value}
                    </p>
                </div>
                <div className={clsx("rounded-xl p-3", colorMap[color])}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
}
