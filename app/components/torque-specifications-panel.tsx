import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PlusCircle } from "lucide-react";
import TorqueSpecDialog from "~/components/torque-spec-dialog";
import type { TorqueSpecification } from "~/db/schema";
import { cn } from "~/utils/tw";

interface TorqueSpecificationsPanelProps {
  motorcycleId: number;
  specs: TorqueSpecification[];
  className?: string;
  hideInteractions?: boolean;
  title?: string;
}

function formatTorqueValue(spec: TorqueSpecification) {
  const formatNumber = (value: number) =>
    value.toLocaleString("de-CH", {
      maximumFractionDigits: 2,
    });

  const base = formatNumber(spec.torque);
  if (spec.torqueEnd != null) {
    return `${base} - ${formatNumber(spec.torqueEnd)}`;
  }
  if (spec.variation != null && Math.abs(spec.variation) > 0) {
    return `${base} ± ${formatNumber(spec.variation)}`;
  }
  return base;
}

function groupTorqueSpecifications(specs: TorqueSpecification[]) {
  const groups = new Map<string, TorqueSpecification[]>();

  specs.forEach((spec) => {
    const key = spec.category || "Weitere";
    const existing = groups.get(key) ?? [];
    existing.push(spec);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).map(([category, categorySpecs]) => ({
    category,
    specs: categorySpecs.sort((a, b) => a.name.localeCompare(b.name, "de-CH")),
  }));
}

export default function TorqueSpecificationsPanel({
  motorcycleId,
  specs,
  className,
  hideInteractions = false,
  title = "Drehmomentwerte",
}: TorqueSpecificationsPanelProps) {
  const grouped = useMemo(() => groupTorqueSpecifications(specs), [specs]);

  return (
    <Card
      className={cn(
        "torque-spec-card print:border-0 print:bg-transparent print:shadow-none",
        className,
      )}
    >
      <CardHeader className="torque-spec-card__header print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl print:text-[24pt] print:font-semibold">
            {title}
          </CardTitle>
          {!hideInteractions && (
            <TorqueSpecDialog motorcycleId={motorcycleId}>
              <Button variant="outline" className="print:hidden">
                <PlusCircle className="h-4 w-4" />
                Eintrag hinzufügen
              </Button>
            </TorqueSpecDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="torque-spec-card__body space-y-6 print:p-0 print:space-y-3">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Für dieses Motorrad sind keine Drehmomentwerte hinterlegt.
          </p>
        ) : (
          grouped.map(({ category, specs: groupedSpecs }) => (
            <div key={category} className="space-y-2 print:space-y-1">
              <p className="torque-spec-category text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-[10pt] print:tracking-[0.08em]">
                {category}
              </p>
              <div className="space-y-2 print:space-y-1">
                {groupedSpecs.map((spec) => (
                  <div
                    key={`${category}-${spec.id}`}
                    className="torque-spec-entry flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm print:border-0 print:bg-transparent print:px-2 print:py-1 print:mb-1 print:gap-2"
                  >
                    <div className="torque-spec-entry__details flex min-w-0 flex-1 flex-col">
                      <span className="font-medium text-foreground print:text-[11pt] print:font-medium">
                        {spec.name}
                      </span>
                      {spec.description && (
                        <span className="torque-spec-entry__description text-xs text-muted-foreground truncate print:text-[9pt] print:text-slate-600 print:whitespace-normal">
                          {spec.description}
                        </span>
                      )}
                    </div>
                    <div className="torque-spec-entry__value-group flex items-center gap-1 text-foreground">
                      <span className="torque-spec-entry__value font-semibold print:text-[12pt]">
                        {formatTorqueValue(spec)}
                      </span>
                      <span className="torque-spec-entry__unit text-xs text-muted-foreground tracking-wide print:text-[9pt] print:uppercase print:tracking-[0.06em] print:text-slate-600">
                        nm
                      </span>
                    </div>
                    {!hideInteractions && (
                      <TorqueSpecDialog motorcycleId={motorcycleId} spec={spec}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 print:hidden"
                        >
                          Bearbeiten
                        </Button>
                      </TorqueSpecDialog>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
