import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useFetcher } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Checkbox } from "~/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { TorqueSpecification } from "~/db/schema";
import type { TorqueImportCandidate } from "~/types/torque";

interface TorqueImportDialogProps {
  motorcycleId: number;
  existingSpecs: TorqueSpecification[];
  candidates: TorqueImportCandidate[];
  children: ReactNode;
}

type FetcherResult =
  | {
      success: true;
      intent: "torque-import";
      imported: number;
      overwritten: number;
    }
  | {
      success: false;
      message?: string;
    };

const normalizeName = (value: string) => value.trim().toLowerCase();

const formatMotorcycleLabel = (candidate: TorqueImportCandidate) => {
  const parts = [candidate.make, candidate.model];
  if (candidate.modelYear) {
    parts.push(`(${candidate.modelYear})`);
  }
  if (candidate.numberPlate) {
    parts.push(`• ${candidate.numberPlate}`);
  }
  return parts.join(" ");
};

const formatTorqueValue = (spec: TorqueSpecification) => {
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
};

export default function TorqueImportDialog({
  motorcycleId,
  existingSpecs,
  candidates,
  children,
}: TorqueImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<string>("");
  const [selectedSpecIds, setSelectedSpecIds] = useState<number[]>([]);
  const fetcher = useFetcher<FetcherResult>();
  const isSubmitting = fetcher.state !== "idle";
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const existingNames = useMemo(() => {
    const set = new Set<string>();
    existingSpecs.forEach((spec) =>
      set.add(normalizeName(spec.name ?? "")),
    );
    return set;
  }, [existingSpecs]);

  const currentCandidate = useMemo(() => {
    if (!selectedMotorcycleId) return null;
    const id = Number.parseInt(selectedMotorcycleId, 10);
    return candidates.find((candidate) => candidate.id === id) ?? null;
  }, [selectedMotorcycleId, candidates]);

  const groupedSpecs = useMemo(() => {
    if (!currentCandidate) return [];
    const groups = new Map<string, TorqueSpecification[]>();
    currentCandidate.torqueSpecifications.forEach((spec) => {
      const key = spec.category || "Weitere";
      const list = groups.get(key) ?? [];
      list.push(spec);
      groups.set(key, list);
    });

    return Array.from(groups.entries()).map(([category, specs]) => ({
      category,
      specs: specs.sort((a, b) => a.name.localeCompare(b.name, "de-CH")),
    }));
  }, [currentCandidate]);

  useEffect(() => {
    if (
      open &&
      fetcher.state === "idle" &&
      fetcher.data &&
      fetcher.data.success
    ) {
      queueMicrotask(() => {
        setOpen(false);
        setSelectedMotorcycleId("");
        setSelectedSpecIds([]);
        setErrorMessage(null);
      });
    }
  }, [open, fetcher.state, fetcher.data]);

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data) return;
    if (fetcher.data.success) {
      queueMicrotask(() => setErrorMessage(null));
      return;
    }
    queueMicrotask(() =>
      setErrorMessage(
        fetcher.data.message ?? "Import konnte nicht ausgeführt werden.",
      ),
    );
  }, [fetcher.state, fetcher.data]);

  const handleToggleSpec = (specId: number, checked: boolean) => {
    setSelectedSpecIds((prev) => {
      if (checked) {
        return prev.includes(specId) ? prev : [...prev, specId];
      }
      return prev.filter((id) => id !== specId);
    });
  };

  const handleSubmit = () => {
    if (!currentCandidate || selectedSpecIds.length === 0) return;
    const formData = new FormData();
    formData.set("intent", "torque-import");
    formData.set("sourceMotorcycleId", String(currentCandidate.id));
    formData.set("motorcycleId", String(motorcycleId));
    selectedSpecIds.forEach((id) => formData.append("torqueIds", String(id)));
    fetcher.submit(formData, { method: "post" });
  };

  const noCandidates = candidates.length === 0;
  const noSpecsAvailable =
    currentCandidate != null &&
    currentCandidate.torqueSpecifications.length === 0;
  const submitDisabled =
    !currentCandidate || selectedSpecIds.length === 0 || isSubmitting;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      if (!selectedMotorcycleId && candidates.length > 0) {
        const defaultId = String(candidates[0]!.id);
        setSelectedMotorcycleId(defaultId);
        setSelectedSpecIds([]);
      }
      return;
    }
    setSelectedMotorcycleId("");
    setSelectedSpecIds([]);
    setErrorMessage(null);
  };

  const handleMotorcycleSelect = (value: string) => {
    setSelectedMotorcycleId(value);
    setSelectedSpecIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-[600px] max-h-[90vh] w-full max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Drehmomentwerte importieren</DialogTitle>
          <DialogDescription>
            Übernimm vorhandene Drehmomentwerte eines anderen Motorrads in diese
            Karte.
          </DialogDescription>
        </DialogHeader>

        {noCandidates ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Es stehen keine weiteren Motorräder für den Import zur Verfügung.
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="space-y-2">
              <Label htmlFor="torque-import-motorcycle">
                Quelle auswählen
              </Label>
              <Select
                value={selectedMotorcycleId}
                onValueChange={handleMotorcycleSelect}
              >
                <SelectTrigger id="torque-import-motorcycle">
                  <SelectValue placeholder="Motorrad auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem
                      key={candidate.id}
                      value={String(candidate.id)}
                    >
                      {formatMotorcycleLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {noSpecsAvailable ? (
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 px-3 py-8 text-sm text-muted-foreground">
                Für dieses Motorrad sind keine Drehmomentwerte hinterlegt.
              </div>
            ) : (
              <ScrollArea className="flex-1 rounded-md border border-border">
                <div className="space-y-4 p-4">
                  {groupedSpecs.map(({ category, specs }) => (
                    <div key={category} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category}
                      </p>
                      <div className="space-y-2">
                        {specs.map((spec) => {
                          const checked = selectedSpecIds.includes(spec.id);
                          const duplicate = existingNames.has(
                            normalizeName(spec.name ?? ""),
                          );

                          return (
                            <label
                              key={spec.id}
                              className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  handleToggleSpec(
                                    spec.id,
                                    value === true,
                                  )
                                }
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">
                                    {spec.name}
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {formatTorqueValue(spec)}{" "}
                                    <span className="text-xs uppercase text-muted-foreground">
                                      nm
                                    </span>
                                  </span>
                                </div>
                                {spec.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {spec.description}
                                  </p>
                                )}
                                {duplicate && (
                                  <p className="flex items-center gap-2 text-xs font-medium text-amber-600">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    Bereits vorhanden – wird überschrieben.
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {errorMessage && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ausgewählte Werte importieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
