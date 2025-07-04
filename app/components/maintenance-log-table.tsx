import { type Maintenance } from "~/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface MaintenanceLogTableProps {
  logs: Maintenance[];
}

const LogTypeBadges: Record<Maintenance["type"], string> = {
  general: "Allgemein",
  oil_change: "Ölwechsel",
  tire_change: "Reifenwechsel",
  brake_fluid_change: "Bremsflüssigkeit",
};

export default function MaintenanceLogTable({
  logs,
}: MaintenanceLogTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Datum</TableHead>
            <TableHead className="w-[150px]">Typ</TableHead>
            <TableHead>Beschreibung & Details</TableHead>
            <TableHead className="w-[120px] text-right">
              Kilometerstand
            </TableHead>
            <TableHead className="w-[100px] text-right">Kosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length > 0 ? (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {format(new Date(log.date), "d. MMM yyyy", { locale: de })}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{LogTypeBadges[log.type]}</Badge>
                </TableCell>
                <TableCell>
                  <p>{log.description}</p>
                </TableCell>
                <TableCell className="text-right">
                  {log.odo.toLocaleString("de-DE")} km
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(log.cost)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Noch keine Wartungseinträge.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
