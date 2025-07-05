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
import { DatePicker } from "./ui/date-picker";

const issueSchema = z.object({
  dateAdded: z.date({ required_error: "Ein Datum ist erforderlich." }),
  description: z
    .string()
    .min(5, "Die Beschreibung muss mindestens 5 Zeichen haben.")
    .max(200, "Die Beschreibung darf nicht länger als 200 Zeichen sein."),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priorität ist erforderlich.",
  }),
});

type AddIssueDialogProps = {
  children: ReactNode;
  motorcycle: Motorcycle;
  issueToEdit?: Issue;
};

export function AddIssueDialog({
  children,
  motorcycle,
  issueToEdit,
}: AddIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!issueToEdit;

  const form = useForm<z.infer<typeof issueSchema>>({
    resolver: zodResolver(issueSchema),
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && issueToEdit) {
        form.reset({
          dateAdded: new Date(issueToEdit.dateAdded),
          description: issueToEdit.description,
          priority: issueToEdit.priority,
        });
      } else {
        form.reset({
          dateAdded: new Date(),
          description: "",
          priority: "medium",
        });
      }
    }
  }, [open, isEditMode, issueToEdit, form]);

  const onSubmit = (values: z.infer<typeof issueSchema>) => {
    let updatedIssues: Issue[];

    if (isEditMode && issueToEdit) {
      updatedIssues =
        motorcycle.issues?.map((issue) =>
          issue.id === issueToEdit.id
            ? { ...issue, ...values, dateAdded: values.dateAdded.toISOString() }
            : issue
        ) || [];
    } else {
      const newIssue: Issue = {
        id: `issue-${Date.now()}-${Math.random()}`,
        dateAdded: values.dateAdded.toISOString(),
        description: values.description,
        priority: values.priority,
      };
      updatedIssues = [...(motorcycle.issues || []), newIssue];
    }

    setOpen(false);
  };

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
              : "Erfasse einen neuen Mangel für deine " +
                motorcycle.make +
                " " +
                motorcycle.model +
                "."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="dateAdded"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Erfasst am</FormLabel>
                    <DatePicker value={field.value} onSelect={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit">
                {isEditMode ? "Änderungen speichern" : "Mangel hinzufügen"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
