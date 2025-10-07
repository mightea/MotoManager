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
import { Label } from "~/components/ui/label";
import type { Motorcycle } from "~/db/schema";

export interface DocumentDialogData {
  id: number;
  title: string;
  filePath: string;
  previewPath?: string | null;
  motorcycleIds: number[];
}

interface DocumentDialogProps {
  motorcycles: Motorcycle[];
  document?: DocumentDialogData;
  children: ReactNode;
}

export function DocumentDialog({
  motorcycles,
  document,
  children,
}: DocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = fetcher.state !== "idle";
  const formKey = `${document ? `edit-${document.id}` : "new"}-${open ? "open" : "closed"}`;
  const intent = document ? "document-edit" : "document-add";

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      (fetcher.data as any)?.success
    ) {
      if (!document) {
        formRef.current?.reset();
      }
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data, document]);

  const handleDelete = () => {
    if (!document) return;
    const confirmed = window.confirm(
      `Dokument "${document.title}" wirklich löschen?`,
    );
    if (!confirmed) return;

    fetcher.submit(
      {
        intent: "document-delete",
        documentId: document.id,
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
            {document ? "Dokument bearbeiten" : "Dokument hochladen"}
          </DialogTitle>
          <DialogDescription>
            {document
              ? "Passe Titel, Zuordnung oder Datei dieses Dokuments an."
              : "Lade ein PDF hoch und ordne es deinen Motorrädern zu."}
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form
          method="post"
          encType="multipart/form-data"
          className="space-y-4"
          ref={formRef}
          key={formKey}
        >
          <input type="hidden" name="intent" value={intent} />
          {document && (
            <input type="hidden" name="documentId" value={document.id} />
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={document?.title ?? ""}
              placeholder="z.B. Wartungsplan 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">PDF-Datei</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              required={!document}
              disabled={!!document}
            />
            {document && (
              <p className="text-xs text-muted-foreground">
                Dateiänderungen sind derzeit nicht möglich.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Zuordnung zu Motorrädern</Label>
            <p className="text-xs text-muted-foreground">
              Keine Auswahl = Dokument gilt für alle Motorräder.
            </p>
            <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {motorcycles.map((moto) => {
                const checked =
                  document?.motorcycleIds?.includes(moto.id) ?? false;
                return (
                  <label
                    key={moto.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="motorcycleIds"
                      value={moto.id}
                      defaultChecked={checked}
                      className="h-4 w-4 rounded border-muted-foreground"
                    />
                    <span className="truncate">
                      {moto.make} {moto.model}
                      {moto.numberPlate && ` (${moto.numberPlate})`}
                    </span>
                  </label>
                );
              })}
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
            {document && (
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
              {document ? "Speichern" : "Hochladen"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentDialog;
