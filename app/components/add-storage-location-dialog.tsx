"use client";

import { useState, type ReactNode, useEffect } from "react";
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
import { Input } from "~/components/ui/input";
import { useToast } from "~/hooks/use-toast";
import type { Location } from "~/db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetcher } from "react-router";

const formSchema = z.object({
  name: z.string().min(2, "Der Name muss mindestens 2 Zeichen haben."),
});

type StorageLocationDialogProps = {
  children: ReactNode;
  locationToEdit?: Location;
};

export function AddStorageLocationDialog({
  children,
  locationToEdit,
}: StorageLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!locationToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && locationToEdit) {
        form.reset({
          name: locationToEdit.name,
        });
      } else {
        form.reset({
          name: "",
        });
      }
    }
  }, [open, isEditMode, locationToEdit, form]);

  const fetcher = useFetcher();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    fetcher.submit(
      {
        intent: isEditMode ? "location-edit" : "location-add",
        id: locationToEdit?.id ?? "",
        ...values,
      },
      { method: "post" }
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const { intent, name } = fetcher.data as {
        intent: string;
        name: string;
      };

      switch (intent) {
        case "location-add":
          toast({
            title: "Standort hinzugefügt",
            description: `Der neue Standort "${name}" wurde erstellt.`,
          });
        case "location-edit":
          toast({
            title: "Standort aktualisiert",
            description: `Der Standort "${name}" wurde gespeichert.`,
          });
      }

      setOpen(false);
    }
  }, [fetcher]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Standort bearbeiten" : "Neuen Standort hinzufügen"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Bearbeite den Namen des Standorts."
              : "Füge eine neue Garage oder einen neuen Stellplatz hinzu."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name des Standorts</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Garage Zuhause" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit">
                {isEditMode ? "Änderungen speichern" : "Standort hinzufügen"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
