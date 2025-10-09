
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ClipboardList, FileText, Gauge, PlusCircle } from "lucide-react";
import MaintenanceLogTable from "./maintenance-log-table";
import TorqueSpecificationsPanel from "./torque-specifications-panel";
import DocumentList, { type DocumentListItem } from "./document-list";
import { AddMaintenanceLogDialog } from "./add-maintenance-log-dialog";
import { Button } from "./ui/button";
import type { MaintenanceRecord, Motorcycle, TorqueSpecification } from "~/db/schema";

interface MotorcycleDesktopTabsProps {
  motorcycle: Motorcycle;
  maintenanceEntries: MaintenanceRecord[];
  torqueSpecifications: TorqueSpecification[];
  documents: DocumentListItem[];
  currentOdo: number;
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MotorcycleDesktopTabs({
  motorcycle,
  maintenanceEntries,
  torqueSpecifications,
  documents,
  currentOdo,
  activeTab,
  onTabChange,
}: MotorcycleDesktopTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="w-full"
      defaultValue="maintenance"
    >
      <TabsList className="grid w-full grid-cols-3 gap-2">
        <TabsTrigger
          value="maintenance"
          aria-label="Wartungsprotokoll"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium sm:text-xs lg:flex-row lg:gap-2 lg:text-sm"
        >
          <ClipboardList className="h-4 w-4" />
          <span className="hidden lg:inline">Wartungsprotokoll</span>
        </TabsTrigger>
        <TabsTrigger
          value="torque"
          aria-label="Drehmomentwerte"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium sm:text-xs lg:flex-row lg:gap-2 lg:text-sm"
        >
          <Gauge className="h-4 w-4" />
          <span className="hidden lg:inline">Drehmomentwerte</span>
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          aria-label="Dokumente"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium sm:text-xs lg:flex-row lg:gap-2 lg:text-sm"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden lg:inline">Dokumente</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="maintenance">
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
            <MaintenanceLogTable
              logs={maintenanceEntries}
              motorcycle={motorcycle}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="torque">
        <TorqueSpecificationsPanel
          motorcycleId={motorcycle.id}
          specs={torqueSpecifications}
        />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentList documents={documents} />
      </TabsContent>
    </Tabs>
  );
}
