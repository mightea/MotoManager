"use client";

import { useState, type ReactNode, useEffect } from "react";
import { z } from "zod";
import { format } from "date-fns";

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
import { Input } from "./ui/input";
import type { Motorcycle } from "~/db/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  storageLocationId: z.string().optional(),
  odometer: z.coerce
    .number()
    .min(0, "Kilometerstand muss eine positive Zahl sein."),
  date: z.string().min(1, "Datum ist erforderlich."),
});

type LocationUpdateDialogProps = {
  children: ReactNode;
  motorcycle: Motorcycle;
};

export function LocationUpdateDialog({
  children,
  motorcycle,
}: LocationUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const currentOdometer = motorcycle.manualOdo || motorcycle.initialOdo;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storageLocationId: motorcycle.storageLocationId || "",
      odometer: currentOdometer,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        storageLocationId: motorcycle.storageLocationId || "",
        odometer: motorcycle.manualOdometer || motorcycle.initialOdo,
        date: format(new Date(), "yyyy-MM-dd"),
      });
    }
  }, [open, motorcycle, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateMotorcycle({
      ...motorcycle,
      storageLocationId: values.storageLocationId,
      manualOdometer: values.odometer,
      lastOdoUpdate: new Date(values.date).toISOString(),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schnell-Update</DialogTitle>
          <DialogDescription>
            Aktualisiere den aktuellen Standort und Kilometerstand für deine{" "}
            {motorcycle.make}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="odometer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aktueller Kilometerstand</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storageLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Standort</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Standort wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {storageLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum der Aktualisierung</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
              <Button type="submit">Speichern</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
