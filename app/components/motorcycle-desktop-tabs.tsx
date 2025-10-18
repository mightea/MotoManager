
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ClipboardList, Droplets, FileText, Gauge } from "lucide-react";
import type { DocumentListItem } from "./document-list";
import type { MaintenanceRecord } from "~/db/schema";
import { cn } from "~/lib/utils";

interface MotorcycleDesktopTabsProps {
  maintenanceEntries: MaintenanceRecord[];
  documents: DocumentListItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MotorcycleDesktopTabs({
  maintenanceEntries,
  documents,
  activeTab,
  onTabChange,
}: MotorcycleDesktopTabsProps) {
  const hasDocuments = documents.length > 0;
  const hasInsights = maintenanceEntries.some((entry) =>
    ["fluid", "inspection", "service"].includes(entry.type),
  );
  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="w-full"
      defaultValue="maintenance"
    >
      <TabsList
        className={cn(
          "grid w-full gap-2",
          hasDocuments && hasInsights
            ? "grid-cols-4"
            : hasDocuments || hasInsights
              ? "grid-cols-3"
              : "grid-cols-2",
        )}
      >
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
        {hasInsights && (
          <TabsTrigger
            value="insights"
            aria-label="Wartungs-Insights"
            className="flex items-center justify-center px-2 py-2 text-sm font-medium sm:text-xs lg:flex-row lg:gap-2 lg:text-sm"
          >
            <Droplets className="h-4 w-4" />
            <span className="hidden lg:inline">Wartungs-Insights</span>
          </TabsTrigger>
        )}
        {hasDocuments && (
          <TabsTrigger
            value="documents"
            aria-label="Dokumente"
            className="flex items-center justify-center px-2 py-2 text-sm font-medium sm:text-xs lg:flex-row lg:gap-2 lg:text-sm"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">Dokumente</span>
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
