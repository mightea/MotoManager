import type { ComponentType } from "react";
import { differenceInDays } from "date-fns/differenceInDays";
import { differenceInMonths } from "date-fns/differenceInMonths";
import { differenceInYears } from "date-fns/differenceInYears";
import { format } from "date-fns/format";
import { de } from "date-fns/locale/de";
import type { MaintenanceRecord } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Battery,
  Droplet,
  Droplets,
  ListChecks,
  LoaderPinwheel,
  ShipWheel,
  Wrench,
} from "lucide-react";

const formatRelative = (date: Date) => {
  const now = new Date();
  const days = differenceInDays(now, date);
  if (days < 14) {
    if (days <= 0) return "heute";
    if (days === 1) return "vor 1 Tag";
    return `vor ${days} Tagen`;
  }

  const months = differenceInMonths(now, date);
  if (months < 24) {
    if (months <= 0) return "vor weniger als einem Monat";
    if (months === 1) return "vor 1 Monat";
    return `vor ${months} Monaten`;
  }

  const years = differenceInYears(now, date);
  if (years <= 1) {
    return "vor etwa einem Jahr";
  }
  return `vor ${years} Jahren`;
};

const summarize = (
  entries: MaintenanceRecord[],
  predicate: (entry: MaintenanceRecord) => boolean,
) =>
  entries
    .filter((entry) => predicate(entry) && entry.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    .at(0) ?? null;

const getDistanceLabel = (currentOdo: number, entry?: MaintenanceRecord | null) => {
  if (!entry || typeof entry.odo !== "number") {
    return null;
  }
  const diff = currentOdo - entry.odo;
  if (diff <= 0) return null;
  return `${diff.toLocaleString("de-CH")} km`;
};

interface MaintenanceInsightsProps {
  maintenanceEntries: MaintenanceRecord[];
  currentOdo: number;
}

export default function MaintenanceInsights({
  maintenanceEntries,
  currentOdo,
}: MaintenanceInsightsProps) {
  if (maintenanceEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wartungs-Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Es liegen noch keine Wartungseinträge vor.
          </p>
        </CardContent>
      </Card>
    );
  }

  const oilEngine = summarize(
    maintenanceEntries,
    (entry) => entry.type === "fluid" && entry.fluidType === "engineoil",
  );
  const oilGearbox = summarize(
    maintenanceEntries,
    (entry) => entry.type === "fluid" && entry.fluidType === "gearboxoil",
  );
  const oilFinalDrive = summarize(
    maintenanceEntries,
    (entry) => entry.type === "fluid" && entry.fluidType === "finaldriveoil",
  );
  const oilFork = summarize(
    maintenanceEntries,
    (entry) => entry.type === "fluid" && entry.fluidType === "forkoil",
  );
  const battery = summarize(
    maintenanceEntries,
    (entry) => entry.type === "battery",
  );
  const tireFront = summarize(
    maintenanceEntries,
    (entry) => entry.type === "tire" && entry.tirePosition === "front",
  );
  const tireRear = summarize(
    maintenanceEntries,
    (entry) => entry.type === "tire" && entry.tirePosition === "rear",
  );
  const brakePadFront = summarize(
    maintenanceEntries,
    (entry) => entry.type === "brakepad" && entry.tirePosition === "front",
  );
  const brakePadRear = summarize(
    maintenanceEntries,
    (entry) => entry.type === "brakepad" && entry.tirePosition === "rear",
  );
  const brakeRotorFront = summarize(
    maintenanceEntries,
    (entry) => entry.type === "brakerotor" && entry.tirePosition === "front",
  );
  const brakeRotorRear = summarize(
    maintenanceEntries,
    (entry) => entry.type === "brakerotor" && entry.tirePosition === "rear",
  );
  const chain = summarize(
    maintenanceEntries,
    (entry) => entry.type === "chain",
  );
  const inspection = summarize(
    maintenanceEntries,
    (entry) => entry.type === "inspection",
  );
  const service = summarize(
    maintenanceEntries,
    (entry) => entry.type === "service",
  );

  const insights = [
    oilEngine && {
      icon: Droplets,
      label: "Motoröl gewechselt",
      date: oilEngine.date,
      distance: getDistanceLabel(currentOdo, oilEngine),
    },
    oilGearbox && {
      icon: Droplet,
      label: "Getriebeöl gewechselt",
      date: oilGearbox.date,
      distance: getDistanceLabel(currentOdo, oilGearbox),
    },
    oilFinalDrive && {
      icon: Droplet,
      label: "Endantriebsöl gewechselt",
      date: oilFinalDrive.date,
      distance: getDistanceLabel(currentOdo, oilFinalDrive),
    },
    oilFork && {
      icon: Droplet,
      label: "Gabelöl gewechselt",
      date: oilFork.date,
      distance: getDistanceLabel(currentOdo, oilFork),
    },
    battery && {
      icon: Battery,
      label: "Batterie gewechselt",
      date: battery.date,
      distance: getDistanceLabel(currentOdo, battery),
    },
    tireFront && {
      icon: ShipWheel,
      label: "Vorderreifen gewechselt",
      date: tireFront.date,
      distance: getDistanceLabel(currentOdo, tireFront),
    },
    tireRear && {
      icon: ShipWheel,
      label: "Hinterreifen gewechselt",
      date: tireRear.date,
      distance: getDistanceLabel(currentOdo, tireRear),
    },
    brakePadFront && {
      icon: LoaderPinwheel,
      label: "Bremsbeläge vorn",
      date: brakePadFront.date,
      distance: getDistanceLabel(currentOdo, brakePadFront),
    },
    brakePadRear && {
      icon: LoaderPinwheel,
      label: "Bremsbeläge hinten",
      date: brakePadRear.date,
      distance: getDistanceLabel(currentOdo, brakePadRear),
    },
    brakeRotorFront && {
      icon: LoaderPinwheel,
      label: "Bremsscheiben vorn",
      date: brakeRotorFront.date,
      distance: getDistanceLabel(currentOdo, brakeRotorFront),
    },
    brakeRotorRear && {
      icon: LoaderPinwheel,
      label: "Bremsscheiben hinten",
      date: brakeRotorRear.date,
      distance: getDistanceLabel(currentOdo, brakeRotorRear),
    },
    chain && {
      icon: Wrench,
      label: "Kette gewechselt",
      date: chain.date,
      distance: getDistanceLabel(currentOdo, chain),
    },
    inspection && {
      icon: ListChecks,
      label: "Letzte Inspektion",
      date: inspection.date,
      distance: getDistanceLabel(currentOdo, inspection),
    },
    service && {
      icon: Wrench,
      label: "Letzter Service",
      date: service.date,
      distance: getDistanceLabel(currentOdo, service),
    },
  ].filter(Boolean) as Array<{
    icon: ComponentType<{ className?: string }>;
    label: string;
    date?: string;
    distance: string | null;
  }>;

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wartungs-Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Für Wartungsarten wie Ölwechsel oder Inspektionen liegen noch keine
            Einträge vor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wartungs-Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map(({ icon: Icon, label, date, distance }) => {
          const parsedDate = date ? new Date(date) : null;
          const formattedDate = parsedDate
            ? format(parsedDate, "d. MMM yyyy", { locale: de })
            : "Datum unbekannt";
          const relative = parsedDate ? formatRelative(parsedDate) : null;

          return (
            <div
              key={label}
              className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
                <span>{formattedDate}</span>
                {relative && <span>({relative})</span>}
                {distance && (
                  <span className="text-xs text-muted-foreground/80">
                    {distance} seitdem
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
