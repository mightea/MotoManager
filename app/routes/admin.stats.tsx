import type { ReactNode } from "react";
import { data, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/admin.stats";
import { getDb } from "~/db";
import {
  documents,
  documentMotorcycles,
  issues,
  locations,
  locationRecords,
  maintenanceRecords,
  motorcycles,
  sessions,
  torqueSpecs,
  users,
} from "~/db/schema";
import {
  mergeHeaders,
  requireAdmin,
  requireUser,
} from "~/services/auth.server";
import { sql, eq, ne } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import {
  BarChart3,
  ClipboardList,
  FileText,
  Bike,
  Users as UsersIcon,
  Wrench,
  MapPin,
  Database,
} from "lucide-react";

type SystemStats = {
  totalUsers: number;
  activeSessions: number;
  totalMotorcycles: number;
  archivedMotorcycles: number;
  totalDocuments: number;
  documentAssignments: number;
  totalIssues: number;
  openIssues: number;
  totalMaintenance: number;
  totalLocations: number;
  totalLocationRecords: number;
  totalTorqueSpecs: number;
  avgMotorcyclesPerUser: number;
  avgDocumentsPerUser: number;
};

const numberFormatter = new Intl.NumberFormat("de-CH");
const decimalFormatter = new Intl.NumberFormat("de-CH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function meta({}: Route.MetaArgs) {
  return [{ title: "Serverstatistiken" }];
}

async function getCount<T>(query: Promise<{ count: T }[]>): Promise<number> {
  const [result] = await query;
  const raw = result?.count;
  if (typeof raw === "number") {
    return raw;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  requireAdmin(user);

  const db = await getDb();

  const [
    totalUsers,
    activeSessions,
    totalMotorcycles,
    archivedMotorcycles,
    totalDocuments,
    documentAssignments,
    totalIssues,
    openIssues,
    totalMaintenance,
    totalLocations,
    totalLocationRecords,
    totalTorqueSpecs,
  ] = await Promise.all([
    getCount(db.select({ count: sql<number>`count(*)` }).from(users)),
    getCount(db.select({ count: sql<number>`count(*)` }).from(sessions)),
    getCount(db.select({ count: sql<number>`count(*)` }).from(motorcycles)),
    getCount(
      db
        .select({ count: sql<number>`count(*)` })
        .from(motorcycles)
        .where(eq(motorcycles.isArchived, true)),
    ),
    getCount(db.select({ count: sql<number>`count(*)` }).from(documents)),
    getCount(
      db.select({ count: sql<number>`count(*)` }).from(documentMotorcycles),
    ),
    getCount(db.select({ count: sql<number>`count(*)` }).from(issues)),
    getCount(
      db
        .select({ count: sql<number>`count(*)` })
        .from(issues)
        .where(ne(issues.status, "done")),
    ),
    getCount(
      db.select({ count: sql<number>`count(*)` }).from(maintenanceRecords),
    ),
    getCount(db.select({ count: sql<number>`count(*)` }).from(locations)),
    getCount(db.select({ count: sql<number>`count(*)` }).from(locationRecords)),
    getCount(db.select({ count: sql<number>`count(*)` }).from(torqueSpecs)),
  ]);

  const avgMotorcyclesPerUser =
    totalUsers > 0 ? totalMotorcycles / totalUsers : 0;
  const avgDocumentsPerUser = totalUsers > 0 ? totalDocuments / totalUsers : 0;

  const stats: SystemStats = {
    totalUsers,
    activeSessions,
    totalMotorcycles,
    archivedMotorcycles,
    totalDocuments,
    documentAssignments,
    totalIssues,
    openIssues,
    totalMaintenance,
    totalLocations,
    totalLocationRecords,
    totalTorqueSpecs,
    avgMotorcyclesPerUser,
    avgDocumentsPerUser,
  };

  return data({ stats }, { headers: mergeHeaders(headers ?? {}) });
}

function StatCard({
  title,
  description,
  value,
  icon,
}: {
  title: string;
  description: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-white/90 shadow-md backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold text-foreground">
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="rounded-lg border border-border/40 bg-primary/10 p-2 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-headline font-semibold text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminStats() {
  const { stats } = useLoaderData<typeof loader>();

  const overviewStats = [
    {
      title: "Benutzer insgesamt",
      value: numberFormatter.format(stats.totalUsers),
      description: "Registrierte Konten im System",
      icon: <UsersIcon className="h-6 w-6" />,
    },
    {
      title: "Aktive Sessions",
      value: numberFormatter.format(stats.activeSessions),
      description: "Aktuell gültige Anmeldungen",
      icon: <Database className="h-6 w-6" />,
    },
  ];

  const motorcycleStats = [
    {
      title: "Motorräder gesamt",
      value: numberFormatter.format(stats.totalMotorcycles),
      description: "Alle erfassten Motorräder",
      icon: <Bike className="h-6 w-6" />,
    },
    {
      title: "Archivierte Motorräder",
      value: numberFormatter.format(stats.archivedMotorcycles),
      description: "Motorräder im Archivstatus",
      icon: <ClipboardList className="h-6 w-6" />,
    },
    {
      title: "Ø Motorräder pro Nutzer",
      value: decimalFormatter.format(stats.avgMotorcyclesPerUser),
      description: "Verhältnis Fahrzeuge zu Nutzern",
      icon: <BarChart3 className="h-6 w-6" />,
    },
  ];

  const documentStats = [
    {
      title: "Dokumente",
      value: numberFormatter.format(stats.totalDocuments),
      description: "Gespeicherte PDF-Dateien",
      icon: <FileText className="h-6 w-6" />,
    },
    {
      title: "Zuordnungen",
      value: numberFormatter.format(stats.documentAssignments),
      description: "Dokument-Motorrad Beziehungen",
      icon: <FileText className="h-6 w-6" />,
    },
    {
      title: "Ø Dokumente pro Nutzer",
      value: decimalFormatter.format(stats.avgDocumentsPerUser),
      description: "Verhältnis Dokumente zu Nutzern",
      icon: <BarChart3 className="h-6 w-6" />,
    },
  ];

  const operationsStats = [
    {
      title: "Wartungen",
      value: numberFormatter.format(stats.totalMaintenance),
      description: "Gespeicherte Wartungseinträge",
      icon: <Wrench className="h-6 w-6" />,
    },
    {
      title: "Offene Mängel",
      value: numberFormatter.format(stats.openIssues),
      description: "Issues mit Status nicht erledigt",
      icon: <ClipboardList className="h-6 w-6" />,
    },
    {
      title: "Issues gesamt",
      value: numberFormatter.format(stats.totalIssues),
      description: "Alle erfassten Issues",
      icon: <ClipboardList className="h-6 w-6" />,
    },
  ];

  const auxiliaryStats = [
    {
      title: "Standorte",
      value: numberFormatter.format(stats.totalLocations),
      description: "Einzigartige Lagerorte",
      icon: <MapPin className="h-6 w-6" />,
    },
    {
      title: "Standort-Historie",
      value: numberFormatter.format(stats.totalLocationRecords),
      description: "Erfasste Standortwechsel",
      icon: <MapPin className="h-6 w-6" />,
    },
    {
      title: "Drehmomentwerte",
      value: numberFormatter.format(stats.totalTorqueSpecs),
      description: "Hinterlegte Drehmomentspezifikationen",
      icon: <Wrench className="h-6 w-6" />,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="rounded-2xl border border-border/60 bg-background/95 px-6 py-8 shadow-lg backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
        <p className="text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-headline font-semibold text-foreground">
          Serverstatistiken
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:max-w-2xl">
          Überblick über die Nutzung des Systems – nur für Administratoren
          sichtbar.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/settings">Zurück zu den Einstellungen</Link>
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-headline font-semibold text-foreground">
            Benutzer & Sitzungen
          </h2>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {overviewStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-headline font-semibold text-foreground">
            Motorräder & Fuhrpark
          </h2>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {motorcycleStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-headline font-semibold text-foreground">
            Dokumente
          </h2>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {documentStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-headline font-semibold text-foreground">
            Betrieb & Aktivitäten
          </h2>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {operationsStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-headline font-semibold text-foreground">
            Infrastruktur
          </h2>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {auxiliaryStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>
    </main>
  );
}
