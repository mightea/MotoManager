
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ClipboardList, Droplets, FileText, Gauge, Info } from "lucide-react";
import type { DocumentListItem } from "./document-list";
import type { MaintenanceRecord } from "~/db/schema";
import { cn } from "~/lib/utils";

interface MotorcycleMobileTabsProps {
  maintenanceEntries: MaintenanceRecord[];
  documents: DocumentListItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MotorcycleMobileTabs({
  maintenanceEntries,
  documents,
  activeTab,
  onTabChange,
}: MotorcycleMobileTabsProps) {
  const hasDocuments = documents.length > 0;
  const hasInsights = maintenanceEntries.some((entry) =>
    ["fluid", "inspection", "service"].includes(entry.type),
  );
  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="w-full print:hidden"
    >
      <TabsList
        className={cn(
          "grid w-full gap-2",
          hasDocuments && hasInsights
            ? "grid-cols-5"
            : hasDocuments || hasInsights
              ? "grid-cols-4"
              : "grid-cols-3",
        )}
      >
        <TabsTrigger
          value="info"
          aria-label="Übersicht"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium"
        >
          <Info className="h-4 w-4 pointer-events-none" />
        </TabsTrigger>
        <TabsTrigger
          value="maintenance"
          aria-label="Wartungsprotokoll"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium"
        >
          <ClipboardList className="h-4 w-4 pointer-events-none" />
        </TabsTrigger>
        <TabsTrigger
          value="torque"
          aria-label="Drehmomentwerte"
          className="flex items-center justify-center px-2 py-2 text-sm font-medium"
        >
          <Gauge className="h-4 w-4 pointer-events-none" />
        </TabsTrigger>
        {hasInsights && (
          <TabsTrigger
            value="insights"
            aria-label="Wartungs-Insights"
            className="flex items-center justify-center px-2 py-2 text-sm font-medium"
          >
            <Droplets className="h-4 w-4 pointer-events-none" />
          </TabsTrigger>
        )}
        {hasDocuments && (
          <TabsTrigger
            value="documents"
            aria-label="Dokumente"
            className="flex items-center justify-center px-2 py-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4 pointer-events-none" />
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
