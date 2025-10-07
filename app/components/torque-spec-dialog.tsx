import { useEffect, useRef, useState, type ReactNode } from "react";
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
import type { TorqueSpecification } from "~/db/schema";

interface TorqueSpecDialogProps {
  motorcycleId: number;
  spec?: TorqueSpecification;
  children: ReactNode;
}

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
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
          className="space-y-4"
          ref={formRef}
          key={formKey}
        >
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="motorcycleId" value={motorcycleId} />
          {spec && <input type="hidden" name="torqueId" value={spec.id} />}

          <div className="space-y-2">
            <Label htmlFor="category">Kategorie</Label>
            <Input
              id="category"
              name="category"
              required
              defaultValue={spec?.category ?? ""}
              placeholder="z.B. Motor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Bezeichnung</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={spec?.name ?? ""}
              placeholder="z.B. Zylinderkopfbolzen"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </DialogContent>
    </Dialog>
  );
}

export default TorqueSpecDialog;
