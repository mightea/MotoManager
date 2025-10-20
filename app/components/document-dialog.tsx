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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { MotorcycleSelectLabel } from "~/components/motorcycle-select-label";

export interface DocumentDialogData {
  id: number;
  title: string;
  filePath: string;
  previewPath?: string | null;
  motorcycleIds: number[];
}

export interface DocumentSelectableMotorcycle {
  id: number;
  make: string;
  model: string;
  numberPlate: string | null;
  ownerUsername: string | null;
}

interface DocumentDialogProps {
  motorcycles: DocumentSelectableMotorcycle[];
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
  const formKey = `${
    document ? `edit-${document.id}` : "new"
  }-${open ? "open" : "closed"}`;
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
      queueMicrotask(() => setOpen(false));
    }
  }, [fetcher.state, fetcher.data, document]);

  const handleDelete = () => {
    if (!document) return;

    fetcher.submit(
      {
        intent: "document-delete",
        documentId: document.id,
      },
      { method: "post" },
    );
  };

  const mainContent = (
    <>
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
        className="flex h-full flex-col gap-4"
        ref={formRef}
        key={formKey}
      >
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 sm:pr-2">
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
                    <MotorcycleSelectLabel
                      make={moto.make}
                      model={moto.model}
                      ownerUsername={moto.ownerUsername}
                      className="flex-1"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          {document && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:mr-auto sm:w-auto"
                  disabled={isSubmitting}
                >
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Dokument wirklich löschen?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rückgängig gemacht werden. Das
                    Dokument wird dauerhaft entfernt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={isSubmitting}
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {document ? "Speichern" : "Hochladen"}
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

export default DocumentDialog;
