import { type Maintenance, type Motorcycle } from "~/db/schema";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Wrench, Droplets, Replace, Edit } from "lucide-react";

import type { ReactElement } from "react";
import { AddMaintenanceLogDialog } from "./add-maintenance-log-dialog";
import { Button } from "./ui/button";

interface MaintenanceLogTableProps {
  motorcycle: Motorcycle;
  logs: Maintenance[];
}

const LogTypeBadges: Record<Maintenance["type"], string> = {
  other: "Allgemein",
  oil_change: "Ölwechsel",
  tire: "Reifenwechsel",
  brake_fluid_change: "Bremsflüssigkeit",
};

const getIcon = (item: Maintenance): ReactElement => {
  switch (item.type) {
    case "fluid":
      return <Droplets className="h-5 w-5 text-secondary-foreground" />;
    case "tire":
      return <Replace className="h-5 w-5 text-secondary-foreground" />;
    default:
      return <Wrench className="h-5 w-5 text-secondary-foreground" />;
  }
};

export default function MaintenanceLogTable({
  logs,
  motorcycle,
}: MaintenanceLogTableProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency,
    }).format(amount);
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
                    {LogTypeBadges[log.type]}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-4 mt-2 ml-14">
                <p className="text-sm text-foreground leading-relaxed break-words">
                  {log.description}
                </p>
                <div className="flex justify-between text-sm pt-2">
                  <p className="text-muted-foreground">Kosten</p>
                  <p className="font-medium">
                    {formatCurrency(log.cost, log.currency)}
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <AddMaintenanceLogDialog
                    logToEdit={log}
                    motorcycle={motorcycle}
                  >
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                      Bearbeiten
                    </Button>
                  </AddMaintenanceLogDialog>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
