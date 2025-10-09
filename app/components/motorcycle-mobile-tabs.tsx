
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ClipboardList, FileText, Gauge, Info, PlusCircle } from "lucide-react";
import MaintenanceLogTable from "./maintenance-log-table";
import TorqueSpecificationsPanel from "./torque-specifications-panel";
import DocumentList, { type DocumentListItem } from "./document-list";
import { AddMaintenanceLogDialog } from "./add-maintenance-log-dialog";
import { Button } from "./ui/button";
import type {
  Issue,
  MaintenanceRecord,
  Motorcycle,
  TorqueSpecification,
} from "~/db/schema";
import MotorcycleInfo from "./motorcycle-info";
import { OpenIssuesCard } from "./open-issues-card";
import { cn } from "~/lib/utils";

interface MotorcycleMobileTabsProps {
  motorcycle: Motorcycle;
  issues: Issue[];
  maintenanceEntries: MaintenanceRecord[];
  torqueSpecifications: TorqueSpecification[];
  documents: DocumentListItem[];
  currentOdo: number;
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MotorcycleMobileTabs({
  motorcycle,
  issues,
  maintenanceEntries,
  torqueSpecifications,
  documents,
  currentOdo,
  activeTab,
  onTabChange,
}: MotorcycleMobileTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="w-full"
      defaultValue="info"
    >
      <TabsList
        className={cn(
          "grid w-full gap-2",
          documents.length > 0 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        <TabsTrigger
          value="info"
          aria-label="Übersicht"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium"
        >
          <Info className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger
          value="maintenance"
          aria-label="Wartungsprotokoll"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium"
        >
          <ClipboardList className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger
          value="torque"
          aria-label="Drehmomentwerte"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium"
        >
          <Gauge className="h-4 w-4" />
        </TabsTrigger>
        {documents.length > 0 && (
          <TabsTrigger
            value="documents"
            aria-label="Dokumente"
            className="flex items-center justify-center px-2 py-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="info" className="space-y-8">
        <MotorcycleInfo />
        <OpenIssuesCard
          motorcycle={motorcycle}
          issues={issues}
          currentOdometer={currentOdo}
        />
      </TabsContent>
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
