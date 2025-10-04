"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PlusCircle } from "lucide-react";
import TorqueSpecDialog from "~/components/torque-spec-dialog";
import type { TorqueSpecification } from "~/db/schema";

interface TorqueSpecificationsPanelProps {
  motorcycleId: number;
  specs: TorqueSpecification[];
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
}: TorqueSpecificationsPanelProps) {
  const grouped = useMemo(() => groupTorqueSpecifications(specs), [specs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl">Drehmomentwerte</CardTitle>
          <TorqueSpecDialog motorcycleId={motorcycleId}>
            <Button variant="outline">
              <PlusCircle className="h-4 w-4" />
              Eintrag hinzufügen
            </Button>
          </TorqueSpecDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Für dieses Motorrad sind keine Drehmomentwerte hinterlegt.
          </p>
        ) : (
          grouped.map(({ category, specs: groupedSpecs }) => (
            <div key={category} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </p>
              <div className="space-y-2">
                {groupedSpecs.map((spec) => (
                  <div
                    key={`${category}-${spec.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium text-foreground">
                        {spec.name}
                      </span>
                      {spec.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {spec.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-foreground">
                      <span className="font-semibold">
                        {spec.torque.toLocaleString("de-CH", {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground tracking-wide">
                        nm
                      </span>
                      {spec.variation !== null &&
                        spec.variation !== undefined && (
                          <>
                            <span className="font-semibold">
                              {`±${spec.variation.toLocaleString("de-CH", {
                                maximumFractionDigits: 2,
                              })}`}
                            </span>
                            <span className="text-xs text-muted-foreground tracking-wide">
                              nm
                            </span>
                          </>
                        )}
                    </div>
                    <TorqueSpecDialog motorcycleId={motorcycleId} spec={spec}>
                      <Button size="sm" variant="outline" className="h-9">
                        Bearbeiten
                      </Button>
                    </TorqueSpecDialog>
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
