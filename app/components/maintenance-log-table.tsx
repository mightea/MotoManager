import { type Maintenance } from "~/db/schema";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface MaintenanceLogTableProps {
  logs: Maintenance[];
}

const LogTypeBadges: Record<Maintenance["type"], string> = {
  other: "Allgemein",
  oil_change: "Ölwechsel",
  tire_change: "Reifenwechsel",
  brake_fluid_change: "Bremsflüssigkeit",
};

export default function MaintenanceLogTable({
  logs,
}: MaintenanceLogTableProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
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
      {logs.map((log) => (
        <AccordionItem value={log.id.toString()} key={log.id}>
          <AccordionTrigger className="py-4 text-left hover:no-underline">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-4">
                <span className="w-36 text-left text-sm font-medium">
                  {format(new Date(log.date), "d. MMMM yyyy", { locale: de })}
                </span>
                <Badge variant="secondary" className="text-sm">
                  {LogTypeBadges[log.type]}
                </Badge>
              </div>
              <p className="font-semibold text-base whitespace-nowrap">
                {log.odo.toLocaleString("de-DE")} km
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 border-t pt-4 mt-2">
              <p className="text-sm text-foreground leading-relaxed">
                {log.description}
              </p>
              <div className="flex justify-between text-sm pt-2">
                <p className="text-muted-foreground">Kosten</p>
                <p className="font-medium">
                  {formatCurrency(log.cost, log.currency)}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
