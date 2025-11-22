import { 
  Wrench, 
  Battery, 
  Disc, 
  Droplet, 
  Link, 
  ClipboardCheck, 
  Hammer, 
  Layers, 
  CircleDashed, 
  ClipboardList,
  ChevronDown,
  Edit2
} from "lucide-react";
import { useState } from "react";
import type { MaintenanceRecord, MaintenanceType } from "~/db/schema";
import clsx from "clsx";

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  currencyCode?: string | null;
  onEdit: (record: MaintenanceRecord) => void;
}

interface GroupedMaintenanceRecord {
  id: string; // composite key
  date: string;
  odo: number;
  type: MaintenanceType;
  count: number;
  cost: number;
  currency: string | null;
  descriptions: string[];
  originalRecords: MaintenanceRecord[];
}

const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  tire: "Reifenwechsel",
  battery: "Batterie",
  brakepad: "Bremsbeläge",
  chain: "Kette",
  brakerotor: "Bremsscheibe",
  fluid: "Flüssigkeit",
  general: "Allgemein",
  repair: "Reparatur",
  service: "Service",
  inspection: "MFK",
};

const getIconForType = (type: MaintenanceType) => {
  switch (type) {
    case "tire": return CircleDashed;
    case "battery": return Battery;
    case "brakepad": return Layers;
    case "brakerotor": return Disc;
    case "chain": return Link;
    case "fluid": return Droplet;
    case "repair": return Hammer;
    case "service": return ClipboardList;
    case "inspection": return ClipboardCheck;
    case "general": default: return Wrench;
  }
};

const fluidTypeLabels: Record<string, string> = {
  engineoil: "Motoröl",
  gearboxoil: "Getriebeöl",
  finaldriveoil: "Kardanöl",
  driveshaftoil: "Kardanwellenöl",
  forkoil: "Gabelöl",
  breakfluid: "Bremsflüssigkeit",
  coolant: "Kühlflüssigkeit",
};

const tirePositionLabels: Record<string, string> = {
  front: "Vorne",
  rear: "Hinten",
  sidecar: "Beiwagen",
};

function generateDescription(record: MaintenanceRecord): string | null {
  const parts: string[] = [];

  // Tires
  if (record.type === "tire") {
    const brandModel = [record.brand, record.model].filter(Boolean).join(" ");
    if (brandModel) parts.push(brandModel);
    
    if (record.tirePosition && tirePositionLabels[record.tirePosition]) {
       parts.push(`(${tirePositionLabels[record.tirePosition]})`);
    } else if (record.tirePosition) {
       parts.push(`(${record.tirePosition})`);
    }

    if (record.tireSize) parts.push(record.tireSize);
    if (record.dotCode) parts.push(`DOT ${record.dotCode}`);
  }

  // Fluids
  else if (record.type === "fluid") {
    if (record.fluidType) {
        parts.push(fluidTypeLabels[record.fluidType] || record.fluidType);
    }
    if (record.brand) parts.push(record.brand);
    if (record.viscosity) parts.push(record.viscosity);
  }

  // Battery
  else if (record.type === "battery") {
     if (record.brand) parts.push(record.brand);
     if (record.model) parts.push(record.model);
     if (record.batteryType) parts.push(record.batteryType);
  }

  // Others (Brakes, Chain, etc.)
  else {
      if (record.brand) parts.push(record.brand);
      if (record.model) parts.push(record.model);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function groupMaintenanceRecords(records: MaintenanceRecord[]): GroupedMaintenanceRecord[] {
  const groups = new Map<string, GroupedMaintenanceRecord>();

  for (const record of records) {
    const key = `${record.date}-${record.odo}-${record.type}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        date: record.date,
        odo: record.odo,
        type: record.type,
        count: 0,
        cost: 0,
        currency: record.currency || null,
        descriptions: [],
        originalRecords: [],
      });
    }

    const group = groups.get(key)!;
    group.count += 1;
    group.cost += record.cost || 0;
    
    if (!group.currency && record.currency) {
      group.currency = record.currency;
    }

    if (record.description) {
         if (!group.descriptions.includes(record.description)) {
            group.descriptions.push(record.description);
         }
    }
    
    group.originalRecords.push(record);
  }

  return Array.from(groups.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function MaintenanceList({ records, currencyCode, onEdit }: MaintenanceListProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  const numberFormatter = new Intl.NumberFormat("de-CH", {
      maximumFractionDigits: 0,
  });

  const groupedRecords = groupMaintenanceRecords(records);

  const toggleExpand = (id: string) => {
    setExpandedGroupId(expandedGroupId === id ? null : id);
  };

  if (groupedRecords.length === 0) {
    return (
      <p className="text-sm text-secondary dark:text-navy-400">
        Keine Wartungseinträge vorhanden.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {groupedRecords.map((group) => {
        const currencyFormatter = new Intl.NumberFormat("de-CH", {
            style: "currency",
            currency: group.currency || currencyCode || "CHF",
        });

        const Icon = getIconForType(group.type);
        const isExpanded = expandedGroupId === group.id;

        // Determine display description
        let description = "";
        
        if (group.descriptions.length > 0) {
            description = group.descriptions.join(", ");
        } else {
            const generatedParts = group.originalRecords
                .map(generateDescription)
                .filter((s): s is string => s !== null);
            
            if (generatedParts.length > 0) {
                description = generatedParts.join(", ");
            } else {
                description = maintenanceTypeLabels[group.type] || group.type;
            }
        }

        return (
          <li key={group.id} className="rounded-xl transition-colors hover:bg-gray-50/50 dark:hover:bg-navy-700/30">
            <div 
                onClick={() => toggleExpand(group.id)}
                className="group flex cursor-pointer items-start gap-4 p-2"
            >
                <div className="mt-1 grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-secondary transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-navy-700 dark:text-navy-300 dark:group-hover:bg-navy-600 dark:group-hover:text-primary-light shrink-0">
                    <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground dark:text-white">
                            {dateFormatter.format(new Date(group.date))}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground dark:text-white tabular-nums">
                                {numberFormatter.format(group.odo)} km
                            </span>
                            <ChevronDown className={clsx("h-4 w-4 text-secondary transition-transform dark:text-navy-400", isExpanded && "rotate-180")} />
                        </div>
                    </div>
                
                    <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-secondary dark:text-navy-400 line-clamp-2">
                            {group.count > 1 && (
                                <span className="mr-1.5 inline-flex items-center justify-center rounded-md bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary dark:bg-navy-600 dark:text-navy-200 align-middle">
                                    {group.count}x
                                </span>
                            )}
                            {description}
                        </p>
                        
                        {group.cost > 0 && (
                            <span className="shrink-0 text-sm font-medium text-secondary dark:text-navy-300">
                                {currencyFormatter.format(group.cost)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="ml-14 mr-2 mb-2 space-y-2 border-t border-gray-100 pt-2 dark:border-navy-600">
                    {group.originalRecords.map((record) => {
                         const recordDesc = record.description || generateDescription(record) || maintenanceTypeLabels[record.type];
                         return (
                            <div key={record.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-navy-800">
                                <div className="text-sm">
                                    <p className="font-medium text-foreground dark:text-white">
                                        {recordDesc}
                                    </p>
                                    {(record.brand || record.model) && (
                                        <p className="text-xs text-secondary dark:text-navy-400">
                                            {[record.brand, record.model].filter(Boolean).join(" ")}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(record);
                                    }}
                                    className="rounded-lg p-2 text-secondary hover:bg-gray-200 hover:text-primary dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-primary-light"
                                    title="Bearbeiten"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            </div>
                         );
                    })}
                </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}