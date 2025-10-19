import { useState, type ReactNode, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import type { Issue, Motorcycle } from "~/db/schema";
import { Input } from "./ui/input";
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
} from "./ui/alert-dialog";
import { dateInputString } from "~/utils/dateUtils";

const issueSchema = z.object({
  date: z.string().min(1, "Ein Datum ist erforderlich."),
  description: z
    .string()
    .min(5, "Die Beschreibung muss mindestens 5 Zeichen haben.")
    .max(200, "Die Beschreibung darf nicht länger als 200 Zeichen sein."),
  priority: z.enum(["low", "medium", "high"] as const),
  odo: z.coerce.number().min(0, "Der Kilometerstand muss positiv sein."),
  status: z.enum(["new", "in_progress", "done"] as const),
});

type IssueFormValues = z.input<typeof issueSchema>;

type AddIssueDialogProps = {
  children: ReactNode;
  motorcycle: Motorcycle;
  issueToEdit?: Issue;
  currentOdometer: number;
};

export function AddIssueDialog({
  children,
  motorcycle,
  issueToEdit,
  currentOdometer,
}: AddIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!issueToEdit;
  const intent = isEditMode ? "issue-edit" : "issue-add";

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
  });

  let fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  const handleDelete = () => {
    fetcher.submit(
      { intent: "issue-delete", issueId: issueToEdit?.id ?? "" },
      { method: "post" },
    );

    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      if (isEditMode && issueToEdit) {
        form.reset({
          date: dateInputString(issueToEdit.date),
          description: issueToEdit.description ?? "",
          priority: issueToEdit.priority,
          status: issueToEdit.status,
          odo: issueToEdit.odo,
        });
      } else {
        form.reset({
          date: dateInputString(new Date()),
          description: "",
          priority: "medium",
          status: "new",
          odo: currentOdometer,
        });
      }
    }
  }, [open, isEditMode, issueToEdit, form, currentOdometer]);

useEffect(() => {
  if (
    fetcher.state === "idle" &&
    fetcher.data &&
    (fetcher.data as any)?.success
  ) {
    queueMicrotask(() => setOpen(false));
  }
}, [fetcher.state, fetcher.data]);

  const handleSubmit = form.handleSubmit((values) => {
    const formData = new FormData();
    formData.set("intent", intent);
    formData.set("motorcycleId", String(motorcycle.id));
    formData.set("issueId", String(issueToEdit?.id ?? ""));
    formData.set("description", values.description);
    formData.set("priority", values.priority);
    formData.set("status", values.status);
    formData.set("date", values.date);
    formData.set("odo", String(values.odo));
    fetcher.submit(formData, { method: "post" });
  });
  
  const mainContent = (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Mangel bearbeiten" : "Neuen Mangel erfassen"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Aktualisiere die Details zu diesem Mangel."
            : `Erfasse einen neuen Mangel für deine ${
                motorcycle?.make ?? ""
              } ${motorcycle?.model ?? ""}.`}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          method="post"
          className="flex flex-1 flex-col gap-6 overflow-hidden"
          onSubmit={handleSubmit}
        >
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="motorcycleId" value={motorcycle.id} />
          <input type="hidden" name="issueId" value={issueToEdit?.id ?? ""} />
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 sm:pr-0">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreibe den Mangel..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorität</FormLabel>
                    <Select
                      name={field.name}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Priorität wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      name={field.name}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Offen</SelectItem>
                        <SelectItem value="in_progress">
                          In Bearbeitung
                        </SelectItem>
                        <SelectItem value="done">Erledigt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Datum</FormLabel>
                    <Input type="date" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odo"
                render={({ field }) => {
                  const value =
                    field.value === undefined || field.value === null
                      ? ""
                      : (field.value as number | string);

                  return (
                    <FormItem>
                      <FormLabel>Kilometerstand</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Kilometerstand"
                          {...field}
                          value={value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>
          <DialogFooter>
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:mr-auto sm:w-auto"
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Mangel wirklich löschen?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden.
                      Dadurch wird der Mangel dauerhaft aus deinen
                      Aufzeichnungen entfernt.
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
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            name="intent"
            value={isEditMode ? "issue-edit" : "issue-add"}
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isEditMode ? "Änderungen speichern" : "Mangel hinzufügen"}
          </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}
