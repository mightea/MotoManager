"use client";

import { useState, type ReactNode, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Trash2 } from "lucide-react";
import { useFetcher } from "react-router";
import { dateInputString } from "~/utils/dateUtils";

const issueSchema = z.object({
  date: z.string({ required_error: "Ein Datum ist erforderlich." }),
  description: z
    .string()
    .min(5, "Die Beschreibung muss mindestens 5 Zeichen haben.")
    .max(200, "Die Beschreibung darf nicht länger als 200 Zeichen sein."),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priorität ist erforderlich.",
  }),
  odo: z.number().min(0, "Der Kilometerstand muss positiv sein."),
  status: z.enum(["open", "in_progress", "done"], {
    required_error: "Status ist erforderlich.",
  }),
});

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

  const form = useForm<z.infer<typeof issueSchema>>({
    resolver: zodResolver(issueSchema),
  });

  let fetcher = useFetcher();

  const handleDelete = () => {
    fetcher.submit(
      { intent: "issue-delete", issueId: issueToEdit?.id ?? "" },
      { method: "post" }
    );

    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      if (isEditMode && issueToEdit) {
        form.reset({
          date: dateInputString(issueToEdit.date),
          description: issueToEdit.description,
          priority: issueToEdit.priority,
          status: issueToEdit.status,
          odo: issueToEdit.odo,
        });
      } else {
        form.reset({
          date: dateInputString(new Date()),
          description: "",
          priority: "medium",
          status: "open",
          odo: currentOdometer,
        });
      }
    }
  }, [open, isEditMode, issueToEdit, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
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
          <form method="post" className="space-y-4">
            <input type="hidden" name="motorcycleId" value={motorcycle.id} />
            <input type="hidden" name="issueId" value={issueToEdit?.id ?? ""} />
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

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="open">Offen</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometerstand</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Kilometerstand"
                        {...field}
                        className="input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              {isEditMode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="sm:mr-auto"
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
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                name="intent"
                value={isEditMode ? "issue-edit" : "issue-add"}
              >
                {isEditMode ? "Änderungen speichern" : "Mangel hinzufügen"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
