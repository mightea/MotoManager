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
  Edit2,
  MapPin,
  Tag,
  Maximize2,
  Calendar,
  Coins,
  Info,
  Hash
} from "lucide-react";
import { useState } from "react";
import type { MaintenanceRecord, MaintenanceType, Location } from "~/db/schema";
import clsx from "clsx";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import { parseDotCode } from "~/utils/maintenance-intervals";

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  currencyCode?: string | null;
  userLocations?: Location[];
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
  location: "Standort",
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
    case "location": return MapPin;
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

function generateDescription(record: MaintenanceRecord, userLocations?: Location[]): string | null {
  const parts: string[] = [];

  // Location
  if (record.type === "location" && record.locationId && userLocations) {
    const loc = userLocations.find(l => l.id === record.locationId);
    if (loc) parts.push(loc.name);
  }

  // Tires
  else if (record.type === "tire") {
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

function groupMaintenanceRecords(records: MaintenanceRecord[], userLocations?: Location[]): GroupedMaintenanceRecord[] {
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

    const desc = generateDescription(record, userLocations);
    const description = record.description || desc; // Use explicit description or generated

    if (description) {
      if (!group.descriptions.includes(description)) {
        group.descriptions.push(description);
      }
    }

    group.originalRecords.push(record);
  }

  return Array.from(groups.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function MaintenanceList({ records, currencyCode, userLocations, onEdit }: MaintenanceListProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  const groupedRecords = groupMaintenanceRecords(records, userLocations);

  // Group by year
  const recordsByYear = new Map<number, typeof groupedRecords>();
  groupedRecords.forEach(group => {
    const year = new Date(group.date).getFullYear();
    if (!recordsByYear.has(year)) {
      recordsByYear.set(year, []);
    }
    recordsByYear.get(year)!.push(group);
  });

  const sortedYears = Array.from(recordsByYear.keys()).sort((a, b) => b - a);

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
    <div className="space-y-8">
      {sortedYears.map((year) => (
        <div key={year} className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-100 dark:bg-navy-700"></div>
            <span className="text-sm font-bold text-secondary dark:text-navy-500">{year}</span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-navy-700"></div>
          </div>

          <ul className="space-y-2">
            {recordsByYear.get(year)!.map((group) => {
              const Icon = getIconForType(group.type);
              const isExpanded = expandedGroupId === group.id;

              // Determine display description
              let description = "";

              if (group.descriptions.length > 0) {
                description = group.descriptions.join(", ");
              } else {
                description = maintenanceTypeLabels[group.type] || group.type;
              }

              return (
                <li key={group.id} className="rounded-xl transition-colors hover:bg-gray-50/50 dark:hover:bg-navy-700/30">
            <button
              type="button"
              onClick={() => toggleExpand(group.id)}
              aria-expanded={isExpanded}
              aria-controls={`maintenance-details-${group.id}`}
              className="group flex w-full cursor-pointer items-start gap-3 py-3 pl-0 text-left"
            >
              <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-xl bg-gray-50 text-secondary transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-navy-700 dark:text-navy-300 dark:group-hover:bg-navy-600 dark:group-hover:text-primary-light shrink-0">
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground dark:text-white">
                    {dateFormatter.format(new Date(group.date))}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground dark:text-white tabular-nums">
                      {formatNumber(group.odo)} km
                    </span>
                    <ChevronDown className={clsx("h-4 w-4 text-secondary transition-transform dark:text-navy-400", isExpanded && "rotate-180")} />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 mt-0.5">
                  <p className="text-sm text-secondary dark:text-navy-400 line-clamp-2">
                    {group.count > 1 && (
                      <span className="mr-1.5 inline-flex items-center justify-center rounded-md bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary dark:bg-navy-600 dark:text-navy-200 align-middle">
                        {group.count}x
                      </span>
                    )}
                    {description}
                  </p>

                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                    {maintenanceTypeLabels[group.type] || group.type}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            <div
              id={`maintenance-details-${group.id}`}
              className={clsx(
              "grid transition-all duration-300 ease-in-out",
              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="mx-2 mb-2 space-y-3 border-t border-gray-100 pt-3 dark:border-navy-600">
                  {group.originalRecords.map((record) => {
                    const metadataItems = [
                      { label: "Beschreibung", value: record.description, icon: Info },
                      { label: "Marke", value: record.brand, icon: Tag },
                      { label: "Modell", value: record.model, icon: Hash },

                      // Type-specific fields
                      ...(record.type === "tire" ? [
                        { label: "Position", value: record.tirePosition ? tirePositionLabels[record.tirePosition] || record.tirePosition : null, icon: MapPin },
                        { label: "Grösse", value: record.tireSize, icon: Maximize2 },
                        { 
                          label: "DOT / Alter", 
                          icon: Calendar,
                          value: (() => {
                            if (!record.dotCode) return null;
                            
                            // Reformat DOT Code (e.g., 1223 -> 12/23)
                            const dotMatch = record.dotCode.match(/(\d{2})(\d{2})$/);
                            const formattedDot = dotMatch ? `${dotMatch[1]}/${dotMatch[2]}` : record.dotCode;
                            
                            const dotDate = parseDotCode(record.dotCode);
                            if (!dotDate) return formattedDot;
                            
                            const ageInYears = (new Date().getTime() - dotDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                            return `${formattedDot} (${ageInYears.toFixed(1)} Jahre)`;
                          })()
                        },
                      ] : []),
                      ...(record.type === "fluid" ? [
                        { label: "Art", value: record.fluidType ? fluidTypeLabels[record.fluidType] || record.fluidType : null, icon: Droplet },
                        { label: "Viskosität", value: record.viscosity, icon: Wrench },
                      ] : []),
                      ...(record.type === "battery" ? [
                        { label: "Batterietyp", value: record.batteryType, icon: Battery },
                      ] : []),
                      ...(record.type === "inspection" ? [
                        { label: "Prüfstelle", value: record.inspectionLocation, icon: MapPin },
                      ] : []),
                      ...(record.type === "location" ? [
                        { label: "Standort", value: userLocations?.find(l => l.id === record.locationId)?.name, icon: MapPin },
                      ] : []),

                      { label: "Kosten", value: record.cost && record.cost > 0 ? formatCurrency(record.cost, record.currency || currencyCode || "CHF") : null, icon: Coins },
                    ].filter(item => item.value !== null && item.value !== undefined && String(item.value).trim() !== "");

                    return (
                      <div key={record.id} className="rounded-xl bg-gray-50 p-3 dark:bg-navy-800">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 dark:border-navy-700">
                          <h4 className="text-sm font-semibold text-foreground dark:text-white">
                            {maintenanceTypeLabels[record.type] || record.type}
                          </h4>
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

                        {metadataItems.length > 0 ? (
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm">
                            {metadataItems.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-gray-50 py-1 dark:border-navy-700/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ItemIcon className="h-3.5 w-3.5 text-secondary/60 dark:text-navy-500 shrink-0" />
                                    <dt className="text-xs font-medium text-secondary dark:text-navy-400 truncate">
                                      {item.label}
                                    </dt>
                                  </div>
                                  <dd className="text-xs font-semibold text-foreground dark:text-gray-200 text-right shrink-0">
                                    {item.value}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                        ) : (
                          <p className="text-sm text-secondary dark:text-navy-400">
                            Keine weiteren Details verfügbar.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </li>
        );
      })}
          </ul>
        </div>
      ))}
    </div>
  );
}

