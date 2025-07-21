import { type MaintenanceRecord, type Motorcycle } from "~/db/schema";
import { Badge } from "./ui/badge";
import { format, formatDistanceToNowStrict } from "date-fns";
import { de } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Wrench,
  Droplets,
  Replace,
  Edit,
  Fingerprint,
  Calendar,
  type LucideIcon,
  MapPin,
  CalendarClock,
  Tag,
  Gauge,
  Hash,
  Layers,
} from "lucide-react";

import type { ReactElement } from "react";
import { AddMaintenanceLogDialog } from "./add-maintenance-log-dialog";
import { Button } from "./ui/button";
import { InfoItem } from "./motorcycle-info";
import { getTireInfo } from "~/utils/motorcycleUtils";
import { Separator } from "./ui/separator";
import { formatCurrency } from "~/utils/numberUtils";

interface MaintenanceLogTableProps {
  motorcycle: Motorcycle;
  logs: MaintenanceRecord[];
}

const getIcon = (item: MaintenanceRecord): ReactElement => {
  switch (item.type) {
    case "fluid":
      return <Droplets className="h-5 w-5 text-secondary-foreground" />;
    case "tire":
      return <Replace className="h-5 w-5 text-secondary-foreground" />;
    default:
      return <Wrench className="h-5 w-5 text-secondary-foreground" />;
  }
};

const getLogBadgeText = (item: MaintenanceRecord): string => {
  switch (item.type) {
    case "tire":
      return "Reifenwechsel";
    case "battery":
      return "Batterie";
    case "brakepad":
      return "Bremsbeläge";
    case "brakerotor":
      return "Bremsscheibe";
    case "fluid":
      return "Flüssigkeit";
    case "chain":
      return "Kette";
    case "repair":
      return "Reparatur";
    case "service":
      return "Service";
    default:
      return "Allgemein";
  }
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center gap-3 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <span className="font-medium text-foreground text-right">{value}</span>
  </div>
);

export default function MaintenanceLogTable({
  logs,
  motorcycle,
}: MaintenanceLogTableProps) {
  const renderLogDetails = (log: MaintenanceRecord) => {
    switch (log.type) {
      case "oil_change":
        const qualityMap = {
          mineral: "Mineralisch",
          "semi-synthetic": "Teilsynthetisch",
          synthetic: "Synthetisch",
        };
        return (
          <>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <DetailRow icon={Tag} label="Marke" value={log.brand} />
              <DetailRow
                icon={Gauge}
                label="Viskosität"
                value={log.viscosity}
              />
              <DetailRow
                icon={Droplets}
                label="Typ"
                value={log.oilType === "engine" ? "Motor" : "Getriebe"}
              />
              <DetailRow
                icon={Layers}
                label="Qualität"
                value={qualityMap[log.oilQuality]}
              />
            </div>
          </>
        );
      case "tire":
        const positionMap = {
          front: "Vorne",
          rear: "Hinten",
          sidecar: "Seitenwagen",
        };
        const tireInfo = getTireInfo(log.dotCode);
        return (
          <>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <DetailRow icon={Tag} label="Marke" value={log.brand} />
              <DetailRow
                icon={MapPin}
                label="Position"
                value={positionMap[log.position]}
              />
              {tireInfo.date && (
                <>
                  <DetailRow
                    icon={Calendar}
                    label="Herstellungsdatum"
                    value={tireInfo.manufacturingDate}
                  />
                </>
              )}
            </div>
          </>
        );
      case "fluid":
        return (
          <>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <DetailRow icon={Tag} label="Marke" value={log.brand} />
              <DetailRow icon={Gauge} label="Typ" value={log.viscosity} />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (logs.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-center text-muted-foreground">
        Noch keine Wartungseinträge.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {logs.map((log) => {
        console.log("Rendering log:", log);
        return (
          <AccordionItem value={log.id.toString()} key={log.id}>
            <AccordionTrigger className="py-4 text-left hover:no-underline">
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex items-start gap-4 overflow-hidden flex-1">
                  <div className="bg-secondary p-2 rounded-md mt-1">
                    {getIcon(log)}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                    <div className="flex flex-row gap-2 items-center text-xs md:text-sm">
                      <span>
                        {format(new Date(log.date), "d. MMMM yyyy", {
                          locale: de,
                        })}
                      </span>
                      <span className="md:hidden">
                        · {log.odo.toLocaleString("de-CH")} km
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left break-words mt-1 w-full">
                      {log.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right pl-2 hidden md:flex">
                  {/* Hide odometer on small screens */}
                  <p className="font-semibold text-base whitespace-nowrap">
                    {log.odo.toLocaleString("de-CH")} km
                  </p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {getLogBadgeText(log)}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 border-t pt-4 mt-2 ml-14">
                <p className="text-sm text-foreground leading-relaxed break-words">
                  {log.description}
                </p>
                {log.cost && (
                  <div className="flex justify-between text-sm pt-2">
                    <p className="text-muted-foreground">Kosten</p>
                    <p className="font-medium">{formatCurrency(log.cost)}</p>
                  </div>
                )}
                {renderLogDetails(log)}
                <div className="flex justify-end pt-2">
                  <AddMaintenanceLogDialog
                    motorcycle={motorcycle}
                    logToEdit={log}
                  >
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Button>
                  </AddMaintenanceLogDialog>
                </div>
              </div>{" "}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
