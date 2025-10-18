import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type { TorqueSpecification } from "~/db/schema";

interface TorqueSpecDialogProps {
  motorcycleId: number;
  spec?: TorqueSpecification;
  children: ReactNode;
}

type VariationMode = "plusminus" | "range";

export function TorqueSpecDialog({
  motorcycleId,
  spec,
  children,
}: TorqueSpecDialogProps) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = fetcher.state !== "idle";
  const intent = spec ? "torque-edit" : "torque-add";
  const formKey = `${spec ? `edit-${spec.id}` : "new"}-${open ? "open" : "closed"}`;
  const defaultVariationMode: VariationMode = useMemo(
    () => (spec?.torqueEnd != null ? "range" : "plusminus"),
    [spec?.torqueEnd],
  );
  const [variationMode, setVariationMode] =
    useState<VariationMode>(defaultVariationMode);

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      (fetcher.data as any)?.success
    ) {
      if (!spec) {
        formRef.current?.reset();
      }
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, spec]);

  useEffect(() => {
    if (open) {
      setVariationMode(defaultVariationMode);
    }
  }, [open, defaultVariationMode]);

  const handleDelete = () => {
    if (!spec) return;
    const confirmed = window.confirm(
      `Drehmomentwert "${spec.name}" wirklich löschen?`,
    );
    if (!confirmed) return;

    fetcher.submit(
      {
        intent: "torque-delete",
        torqueId: spec.id,
      },
      { method: "post" },
    );
  };

  const mainContent = (
    <>
      <DialogHeader>
        <DialogTitle>
          {spec ? "Drehmomentwert bearbeiten" : "Drehmomentwert hinzufügen"}
        </DialogTitle>
        <DialogDescription>
          {spec
            ? "Aktualisiere die Angaben für diesen Drehmomentwert."
            : "Lege einen neuen Drehmomentwert für dieses Motorrad fest."}
        </DialogDescription>
      </DialogHeader>
      <fetcher.Form
        method="post"
        className="flex h-full flex-col gap-4"
        ref={formRef}
        key={formKey}
      >
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 sm:pr-2">
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="motorcycleId" value={motorcycleId} />
          {spec && <input type="hidden" name="torqueId" value={spec.id} />}
          <input type="hidden" name="variationMode" value={variationMode} />

          <div className="space-y-2">
            <Label htmlFor="category">Kategorie</Label>
            <Input
              id="category"
              name="category"
              required
              defaultValue={spec?.category ?? ""}
              placeholder="z.b. Motor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Bezeichnung</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={spec?.name ?? ""}
              placeholder="z.b. Zylinderkopfbolzen"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Toleranzangabe
              </Label>
              <RadioGroup
                className="grid gap-2 sm:grid-cols-2"
                value={variationMode}
                onValueChange={(value) =>
                  setVariationMode(value as VariationMode)
                }
              >
                <div className="flex items-center space-x-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <RadioGroupItem id="mode-plusminus" value="plusminus" />
                  <Label
                    htmlFor="mode-plusminus"
                    className="flex flex-col text-xs leading-tight"
                  >
                    <span className="text-sm font-medium text-foreground">
                      Basiswert ± Toleranz
                    </span>
                    <span className="text-muted-foreground">
                      z.B. 29 ± 3 Nm
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <RadioGroupItem id="mode-range" value="range" />
                  <Label
                    htmlFor="mode-range"
                    className="flex flex-col text-xs leading-tight"
                  >
                    <span className="text-sm font-medium text-foreground">
                      Bereich (Start - Ende)
                    </span>
                    <span className="text-muted-foreground">
                      z.B. 29 - 32 Nm
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="torque">Drehmoment (Nm)</Label>
              <Input
                id="torque"
                name="torque"
                type="number"
                inputMode="numeric"
                min={0}
                step={0.5}
                required
                defaultValue={spec?.torque ?? ""}
              />
            </div>
            {variationMode === "plusminus" ? (
              <div className="space-y-2">
                <Label htmlFor="variation">Toleranz (+/- Nm)</Label>
                <Input
                  id="variation"
                  name="variation"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={0.5}
                  defaultValue={spec?.variation ?? ""}
                  placeholder="optional"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="torqueEnd">Bereichsende (Nm)</Label>
                <Input
                  id="torqueEnd"
                  name="torqueEnd"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={0.5}
                  required
                  defaultValue={spec?.torqueEnd ?? ""}
                  placeholder="z.B. 32"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={spec?.description ?? ""}
              placeholder="Hinweise zum Anziehen oder Werkzeugspezifikation"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          {spec && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Löschen
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {spec ? "Aktualisieren" : "Speichern"}
          </Button>
        </DialogFooter>
      </fetcher.Form>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-full max-h-screen flex-col overflow-y-auto sm:max-w-md md:h-auto md:max-h-[90vh] md:flex-none md:overflow-y-visible">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}

export default TorqueSpecDialog;
