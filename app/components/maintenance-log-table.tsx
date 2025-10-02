import {
  type FluidType,
  type MaintenanceRecord,
  type Motorcycle,
  type OilType,
} from "~/db/schema";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Droplets,
  Edit,
  Calendar,
  type LucideIcon,
  MapPin,
  Tag,
  Gauge,
  Layers,
  Milestone,
  Car,
} from "lucide-react";

import { AddMaintenanceLogDialog } from "./add-maintenance-log-dialog";
import { Button } from "./ui/button";
import { getMaintenanceIcon, getTireInfo } from "~/utils/motorcycleUtils";
import { Separator } from "./ui/separator";
import { formatCurrency } from "~/utils/numberUtils";
import { isFalsy, isTruthy } from "~/utils/falsyUtils";

interface MaintenanceLogTableProps {
  motorcycle: Motorcycle;
  logs: MaintenanceRecord[];
}

const FluidTypeLabels: Record<FluidType, string> = {
  engineoil: "Motoröl",
  gearboxoil: "Getriebeöl",
  forkoil: "Gabelöl",
  driveshaftoil: "Kardanwellenöl",
  finaldriveoil: "Kardanantriebsöl",
  breakfluid: "Bremsflüssigkeit",
  coolant: "Kühlmittel",
};

const TirePositionLabels: Record<string, string> = {
  front: "Vorne",
  rear: "Hinten",
  sidecar: "Seitenwagen",
};

const TirePositionNames: Record<string, string> = {
  front: "Vorderreifen",
  rear: "Hinterreifen",
  sidecar: "Seitenwagenreifen",
};

const OilTypeLabels: Record<OilType, string> = {
  synthetic: "Synthetisch",
  "semi-synthetic": "Halbsynthetisch",
  mineral: "Mineralisch",
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
      switch (item.fluidType) {
        case "coolant":
          return "Kühlmittelwechsel";
        case "breakfluid":
          return "Bremsflüssigkeitswechsel";
        default:
          return `Ölwechsel`;
      }
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

const getDescription = (log: MaintenanceRecord): string => {
  if (isTruthy(log.description)) {
    return log.description;
  }

  switch (log.type) {
    case "tire":
      return `Neuer ${
        log.tirePosition ? `${TirePositionNames[log.tirePosition]}` : ""
      } ${log.brand ?? ""} ${log.model ?? ""} ${
        log.tireSize ?? ""
      } installiert`;
    case "battery":
      return `Batterie ausgetauscht mit ${log.brand ?? ""} ${
        log.batteryType ?? ""
      }`;
    case "brakepad":
      return "Bremsbeläge gewechselt";
    case "brakerotor":
      return "Bremsscheibe gewechselt";
    case "fluid":
      return `${
        log.fluidType ? `${FluidTypeLabels[log.fluidType]}` : ""
      } gewechselt mit ${log.brand ?? ""} ${
        log.viscosity ? `${log.viscosity}` : ""
      }`;
    case "chain":
      return "Kette gewechselt";
    case "repair":
      return "Reparatur durchgeführt";
    case "service":
      return "Service durchgeführt";
    default:
      return "";
  }
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | undefined | null;
}) => {
  if (isFalsy(value)) {
    return null;
  }
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
};

export default function MaintenanceLogTable({
  logs,
  motorcycle,
}: MaintenanceLogTableProps) {
  const renderLogDetails = (log: MaintenanceRecord) => {
    const details = [];

    if (log.brand)
      details.push(
        <DetailRow key="brand" icon={Tag} label="Marke" value={log.brand} />
      );
    if (log.model)
      details.push(
        <DetailRow
          key="model"
          icon={Car}
          label="Modell/Typ"
          value={log.model}
        />
      );

    if (log.type === "fluid") {
      if (log.fluidType)
        details.push(
          <DetailRow
            key="fluidType"
            icon={Droplets}
            label="Flüssigkeit"
            value={FluidTypeLabels[log.fluidType]}
          />
        );
      if (log.viscosity)
        details.push(
          <DetailRow
            key="viscosity"
            icon={Gauge}
            label="Viskosität/Typ"
            value={log.viscosity}
          />
        );

      if (log.oilType) {
        details.push(
          <DetailRow
            key="oilType"
            icon={Droplets}
            label="Öltyp"
            value={OilTypeLabels[log.oilType]}
          />
        );
      }
    }

    if (log.type === "tire") {
      const tireInfo = getTireInfo(log.dotCode ?? undefined);
      if (log.tirePosition)
        details.push(
          <DetailRow
            key="position"
            icon={MapPin}
            label="Position"
            value={TirePositionLabels[log.tirePosition]}
          />
        );
      if (log.tireSize)
        details.push(
          <DetailRow
            key="size"
            icon={Milestone}
            label="Grösse"
            value={log.tireSize}
          />
        );
      if (tireInfo && tireInfo.date) {
        details.push(
          <DetailRow
            key="mfgDate"
            icon={Calendar}
            label="Herstellungsdatum"
            value={tireInfo.manufacturingDate}
          />
        );
      }
    }

    if (log.type === "battery" && log.batteryType) {
      details.push(
        <DetailRow
          key="batteryType"
          icon={Layers}
          label="Batterietyp"
          value={log.batteryType}
        />
      );
    }

    if (details.length === 0) return null;

    return (
      <>
        <Separator className="my-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {details}
        </div>
      </>
    );
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
      {logs.map((log) => (
        <AccordionItem value={log.id.toString()} key={log.id}>
          <AccordionTrigger className="py-4 text-left hover:no-underline">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex items-start gap-4 overflow-hidden flex-1">
                <div className="bg-secondary p-2 rounded-md mt-1">
                  {getMaintenanceIcon({ type: log.type })}
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
                    {getDescription(log)}
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
                {getDescription(log)}
              </p>
              {(log.cost ?? 0) > 0 && (
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
      ))}
    </Accordion>
  );
}
