import { PlusCircle } from "lucide-react";
import { useOutletContext } from "react-router";
import { AddMaintenanceLogDialog } from "~/components/add-maintenance-log-dialog";
import MaintenanceLogTable from "~/components/maintenance-log-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleMaintenanceRoute() {
  const { motorcycle, maintenanceEntries, currentOdo } =
    useOutletContext<MotorcycleOutletContext>();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl">Wartungsprotokoll</CardTitle>
          <AddMaintenanceLogDialog
            motorcycle={motorcycle}
            currentOdometer={currentOdo}
          >
            <Button>
              <PlusCircle className="h-4 w-4" />
              Eintrag hinzufügen
            </Button>
          </AddMaintenanceLogDialog>
        </div>
      </CardHeader>
      <CardContent>
        <MaintenanceLogTable logs={maintenanceEntries} motorcycle={motorcycle} />
      </CardContent>
    </Card>
  );
}
