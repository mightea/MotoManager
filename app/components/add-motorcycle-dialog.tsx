import { useEffect, useRef, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Motorcycle } from "~/db/schema";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { dateInputString } from "~/utils/dateUtils";
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

const formSchema = z.object({
  make: z.string().min(2, "Die Marke muss mindestens 2 Zeichen lang sein."),
  model: z.string().min(1, "Modell ist erforderlich."),
  modelYear: z.coerce
    .number()
    .min(1900, "Baujahr muss nach 1900 liegen.")
    .max(
      new Date().getFullYear() + 1,
      "Baujahr kann nicht in der Zukunft liegen.",
    ),

  vin: z.string().min(1, "FIN ist erforderlich."),
  vehicleIdNr: z.string().min(1, "Stammnummer ist erforderlich."),
  numberPlate: z.string().min(1, "Kontrollschild ist erforderlich."),

  isVeteran: z.boolean(),
  isArchived: z.boolean(),

  firstRegistration: z
    .string()
    .min(1, "Datum der 1. Inverkehrssetzung ist erforderlich."),

  initialOdo: z.coerce
    .number()
    .min(0, "Anfänglicher Kilometerstand ist erforderlich."),
  purchaseDate: z.string().min(1, "Ein Kaufdatum ist erforderlich."),
  purchasePrice: z.coerce.number().min(0, "Kaufpreis ist erforderlich."),
});

type FormValues = z.input<typeof formSchema>;
type AddMotorcycleDialogProps = {
  motorcycleToEdit?: Motorcycle;
  children?: ReactNode;
};

export function AddMotorcycleDialog({
  motorcycleToEdit,
  children,
}: AddMotorcycleDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!motorcycleToEdit;
  const deleteSubmitRef = useRef<HTMLButtonElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isVeteran: false,
      isArchived: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && motorcycleToEdit) {
        const firstRegistration = dateInputString(
          motorcycleToEdit.firstRegistration,
        );
        const purchaseDate = dateInputString(motorcycleToEdit.purchaseDate);

        form.reset({
          make: motorcycleToEdit.make,
          model: motorcycleToEdit.model,
          modelYear: motorcycleToEdit.modelYear ?? new Date().getFullYear(),
          vin: motorcycleToEdit.vin,
          vehicleIdNr: motorcycleToEdit.vehicleIdNr ?? "",
          numberPlate: motorcycleToEdit.numberPlate ?? "",
          isVeteran: motorcycleToEdit.isVeteran,
          isArchived: motorcycleToEdit.isArchived,
          firstRegistration: firstRegistration || "",
          initialOdo: motorcycleToEdit.initialOdo,
          purchaseDate: purchaseDate || "",
          purchasePrice: motorcycleToEdit.purchasePrice ?? 0,
        });
      } else {
        form.reset({
          make: "",
          model: "",
          modelYear: new Date().getFullYear(),
          vin: "",
          vehicleIdNr: "",
          numberPlate: "",
          isVeteran: false,
          isArchived: false,
          firstRegistration: "",
          initialOdo: 0,
          purchaseDate: "",
          purchasePrice: 0,
        });
      }
    }
  }, [open, isEditMode, motorcycleToEdit, form]);

  const mainContent = (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Motorrad bearbeiten" : "Neues Motorrad hinzufügen"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Aktualisiere die Details für dein Motorrad."
            : "Gib die Details für dein neues Motorrad ein, um es zu verfolgen."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form method="post" className="flex h-full flex-col">
          <input
            type="hidden"
            name="motorcycleId"
            value={motorcycleToEdit?.id}
          />
          {isEditMode && (
            <button
              ref={deleteSubmitRef}
              type="submit"
              name="intent"
              value="motorcycle-delete"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
          <ScrollArea className="flex-1 overflow-y-auto pr-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground pt-4">
                Allgemein
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marke</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. BMW" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modell</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. R 90S" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="modelYear"
                  render={({ field }) => {
                    const value =
                      field.value === undefined || field.value === null
                        ? ""
                        : (field.value as number | string);

                    return (
                      <FormItem>
                        <FormLabel>Baujahr</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="z.B. 2023"
                            {...field}
                            value={value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="numberPlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kontrollschild</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. ZH-12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h4 className="text-sm font-medium text-muted-foreground pt-4">
                Identifikation
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fahrgestellnummer (23)</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC123..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleIdNr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stammnummer (18)</FormLabel>
                      <FormControl>
                        <Input placeholder="123.456.789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h4 className="text-sm font-medium text-muted-foreground pt-4">
                Daten & Termine
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstRegistration"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>1. Inverkehrssetzung (36)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h4 className="text-sm font-medium text-muted-foreground pt-4">
                Anschaffung
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Kaufdatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialOdo"
                  render={({ field }) => {
                    const value =
                      field.value === undefined || field.value === null
                        ? ""
                        : (field.value as number | string);

                    return (
                      <FormItem>
                        <FormLabel>Kilometer bei Kauf</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="z.B. 1200"
                            {...field}
                            value={value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => {
                    const value =
                      field.value === undefined || field.value === null
                        ? ""
                        : (field.value as number | string);

                    return (
                      <FormItem>
                        <FormLabel>Kaufpreis (CHF)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="z.B. 15000"
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

              <h4 className="text-sm font-medium text-muted-foreground pt-4">
                Status
              </h4>
              <div className="flex gap-8">
                <FormField
                  control={form.control}
                  name="isVeteran"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          name={field.name}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Veteran?</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isArchived"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          name={field.name}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Archiviert?</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-6">
            {isEditMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="sm:mr-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Motorrad löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Motorrad wirklich löschen?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden.
                      Dadurch werden alle zugehörigen Daten dauerhaft
                      entfernt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setOpen(false);
                        deleteSubmitRef.current?.click();
                      }}
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
            <Button type="submit" name="intent" value="motorcycle-edit">
              {isEditMode ? "Änderungen speichern" : "Motorrad hinzufügen"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-full max-h-screen flex-col overflow-y-auto sm:max-w-2xl md:h-auto md:max-h-[90vh] md:flex-none md:overflow-y-visible">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}
