import { Wrench } from "lucide-react";
import type { MaintenanceRecord } from "~/db/schema";

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  currencyCode?: string | null;
}

interface GroupedMaintenanceRecord {
  id: string; // composite key
  date: string;
  odo: number;
  type: string;
  count: number;
  cost: number;
  currency: string | null;
  descriptions: string[];
  originalRecords: MaintenanceRecord[];
}

function groupMaintenanceRecords(records: MaintenanceRecord[]): GroupedMaintenanceRecord[] {
  const groups = new Map<string, GroupedMaintenanceRecord>();

  for (const record of records) {
    // Create a unique key based on date, odo, and type
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
    
    // Use the first non-null currency found if not set
    if (!group.currency && record.currency) {
      group.currency = record.currency;
    }

    if (record.description && !group.descriptions.includes(record.description)) {
      group.descriptions.push(record.description);
    }
    
    group.originalRecords.push(record);
  }

  // Convert map to array and sort by date descending
  return Array.from(groups.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function MaintenanceList({ records, currencyCode }: MaintenanceListProps) {
  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  const groupedRecords = groupMaintenanceRecords(records);

  if (groupedRecords.length === 0) {
    return (
      <p className="text-sm text-secondary dark:text-navy-400">
        Keine Wartungseinträge vorhanden.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {groupedRecords.map((group) => {
        const currencyFormatter = new Intl.NumberFormat("de-CH", {
            style: "currency",
            currency: group.currency || currencyCode || "CHF",
        });

        // Determine display title
        let title = group.type;
        if (group.descriptions.length > 0) {
             title = group.descriptions.join(", ");
        }

        // If simple type and no description, capitalize type
        if (!group.descriptions.length) {
            title = group.type.charAt(0).toUpperCase() + group.type.slice(1);
        }

        return (
          <li key={group.id} className="flex items-center gap-3 py-1">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary dark:bg-navy-700 dark:text-primary-light shrink-0">
               <Wrench className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-foreground dark:text-gray-200">
                    {group.count > 1 && (
                        <span className="mr-1.5 inline-flex items-center justify-center rounded-md bg-secondary/10 px-1.5 py-0.5 text-xs font-bold text-secondary dark:bg-navy-600 dark:text-navy-200">
                            {group.count}x
                        </span>
                    )}
                    {title}
                </p>
              </div>
              <p className="text-xs text-secondary dark:text-navy-400">
                {dateFormatter.format(new Date(group.date))} • {group.odo} km
                {group.cost > 0 && ` • ${currencyFormatter.format(group.cost)}`}
              </p>
            </div>
            
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-secondary capitalize dark:bg-navy-700 dark:text-navy-300">
              {group.type}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
