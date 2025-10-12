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
import { Badge } from "./ui/badge";

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

const getDistanceLabel = (
  currentOdo: number,
  entry?: MaintenanceRecord | null,
) => {
  if (!entry || typeof entry.odo !== "number") {
    return null;
  }
  const diff = currentOdo - entry.odo;
  if (diff <= 0) return null;
  return `${diff.toLocaleString("de-CH")} km`;
};

type InsightStateVariant = "default" | "secondary" | "destructive" | "outline";

type InsightState = {
  label: string;
  variant: InsightStateVariant;
};

interface InsightItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  date?: string;
  distance: string | null;
  state: InsightState;
}

const getInsightState = (
  date: string | undefined,
  thresholdYears?: number,
): InsightState => {
  if (!date) {
    return { label: "Unbekannt", variant: "outline" };
  }

  const parsedDate = new Date(date);
  const now = new Date();
  const monthsSince = differenceInMonths(now, parsedDate);

  if (monthsSince < 0) {
    return { label: "Geplant", variant: "secondary" };
  }

  if (!thresholdYears) {
    return { label: "Nach Bedarf", variant: "outline" };
  }

  const thresholdMonths = thresholdYears * 12;

  if (monthsSince >= thresholdMonths) {
    return { label: "Überfällig", variant: "destructive" };
  }

  if (thresholdMonths - monthsSince <= 6) {
    return { label: "Bald fällig", variant: "secondary" };
  }

  return { label: "Okay", variant: "outline" };
};

const buildInsight = (
  record: MaintenanceRecord | null,
  config: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    thresholdYears?: number;
    distance: (entry?: MaintenanceRecord | null) => string | null;
  },
): InsightItem | null => {
  if (!record) return null;

  return {
    icon: config.icon,
    label: config.label,
    date: record.date,
    distance: config.distance(record),
    state: getInsightState(record.date, config.thresholdYears),
  };
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

  const insightsByCategory = [
    {
      title: "Flüssigkeiten",
      items: [
        buildInsight(oilEngine, {
          icon: Droplets,
          label: "Motoröl gewechselt",
          thresholdYears: 2,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(oilGearbox, {
          icon: Droplet,
          label: "Getriebeöl gewechselt",
          thresholdYears: 2,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(oilFinalDrive, {
          icon: Droplet,
          label: "Endantriebsöl gewechselt",
          thresholdYears: 2,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(oilFork, {
          icon: Droplet,
          label: "Gabelöl gewechselt",
          thresholdYears: 4,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
      ].filter(Boolean) as InsightItem[],
    },
    {
      title: "Reifen",
      items: [
        buildInsight(tireFront, {
          icon: ShipWheel,
          label: "Vorderreifen gewechselt",
          thresholdYears: 8,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(tireRear, {
          icon: ShipWheel,
          label: "Hinterreifen gewechselt",
          thresholdYears: 8,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
      ].filter(Boolean) as InsightItem[],
    },
    {
      title: "Elektrik",
      items: [
        buildInsight(battery, {
          icon: Battery,
          label: "Batterie gewechselt",
          thresholdYears: battery?.batteryType === "lithium-ion" ? 10 : 6,
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
      ].filter(Boolean) as InsightItem[],
    },
    {
      title: "Bremsen",
      items: [
        buildInsight(brakePadFront, {
          icon: LoaderPinwheel,
          label: "Bremsbeläge vorn",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(brakePadRear, {
          icon: LoaderPinwheel,
          label: "Bremsbeläge hinten",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(brakeRotorFront, {
          icon: LoaderPinwheel,
          label: "Bremsscheiben vorn",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(brakeRotorRear, {
          icon: LoaderPinwheel,
          label: "Bremsscheiben hinten",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
      ].filter(Boolean) as InsightItem[],
    },
    {
      title: "Antrieb",
      items: [
        buildInsight(chain, {
          icon: Wrench,
          label: "Kette gewechselt",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
      ].filter(Boolean) as InsightItem[],
    },
    {
      title: "Wartung",
      items: [
        buildInsight(inspection, {
          icon: ListChecks,
          label: "Letzte Inspektion",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
        buildInsight(service, {
          icon: Wrench,
          label: "Letzter Service",
          distance: (entry) => getDistanceLabel(currentOdo, entry),
        }),
      ].filter(Boolean) as InsightItem[],
    },
  ].filter((category) => category.items.length > 0);

  if (insightsByCategory.length === 0) {
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
      <CardContent className="space-y-6">
        {insightsByCategory.map(({ title, items }) => (
          <div key={title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
              {title}
            </p>
            <div className="space-y-3">
              {items.map(({ icon: Icon, label, date, distance, state }) => {
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {label}
                        </span>
                      </div>
                      <Badge variant={state.variant}>{state.label}</Badge>
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
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
