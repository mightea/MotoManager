"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type { MaintenanceRecord, Motorcycle } from "~/db/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@radix-ui/react-alert-dialog";
import { Trash2 } from "lucide-react";
import { useFetcher } from "react-router";
import { dateInputString } from "~/utils/dateUtils";

// Base schema for common fields
const baseSchema = z.object({
  date: z.string().min(1, "Ein Datum ist erforderlich."),
  odometer: z.coerce
    .number()
    .min(1, "Der Kilometerstand muss größer als 0 sein."),
  cost: z.coerce.number().min(0, "Kosten sind erforderlich."),
  description: z
    .string()
    .min(10, "Die Beschreibung muss mindestens 10 Zeichen lang sein.")
    .max(500),
});

// Schemas for each log type
const generalLogSchema = baseSchema.extend({
  type: z.literal("other"),
});

const oilChangeLogSchema = baseSchema.extend({
  type: z.literal("fluids"),
  oilType: z.enum(["engine", "gear"], {
    required_error: "Öltyp ist erforderlich.",
  }),
  brand: z.string().min(2, "Marke ist erforderlich."),
  viscosity: z.string().min(2, "Viskosität ist erforderlich."),
  synthetic: z.boolean().default(false),
});

const tireChangeLogSchema = baseSchema.extend({
  type: z.literal("tire"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  position: z.enum(["front", "rear", "sidecar"], {
    required_error: "Reifenposition ist erforderlich.",
  }),
  dotCode: z
    .string()
    .min(4, "DOT-Code ist erforderlich.")
    .max(4, "Der DOT-Code muss 4 Ziffern haben."),
});

const formSchema = z.discriminatedUnion("type", [
  generalLogSchema,
  oilChangeLogSchema,
  tireChangeLogSchema,
]);

type FormValues = z.infer<typeof formSchema>;

type AddMaintenanceLogDialogProps = {
  children: ReactNode;
  motorcycle: Motorcycle;
  currentOdometer?: number;
  logToEdit?: MaintenanceRecord;
};

export function AddMaintenanceLogDialog({
  children,
  motorcycle,
  currentOdometer,
  logToEdit,
}: AddMaintenanceLogDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!logToEdit;

  const getInitialFormValues = (): FormValues => {
    if (isEditMode && logToEdit) {
      const baseValues = {
        type: logToEdit.type,
        date: dateInputString(logToEdit.date),
        odometer: logToEdit.odo,
        cost: logToEdit.cost ?? 0,
        description: logToEdit.description ?? "",
      };

      switch (logToEdit.type) {
        case "tire":
          return {
            ...baseValues,
            type: "tire",
            brand: "",
            position: "rear",
            dotCode: "",
          };
        case "other":
        default:
          return { ...baseValues, type: "other" };
      }
    }
    return {
      type: "other",
      date: format(new Date(), "yyyy-MM-dd"),
      cost: 0,
      odometer: 0,
      description: "",
    } as FormValues;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialFormValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(getInitialFormValues());
    }
  }, [open, logToEdit, form]);

  let fetcher = useFetcher();

  const handleDelete = () => {
    fetcher.submit(
      { intent: "maintenance-delete", issueId: logToEdit?.id ?? "" },
      { method: "post" }
    );

    setOpen(false);
  };

  const logType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? "Wartungseintrag bearbeiten"
              : "Neuen Wartungseintrag hinzufügen"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Aktualisiere die Details für diesen Service."
              : `Erfasse einen neuen Service oder eine Reparatur für deine ${motorcycle.make} ${motorcycle.model}.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            method="post"
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-4"
          >
            <input type="hidden" name="motorcycleId" value={motorcycle.id} />
            <input type="hidden" name="type" value={logType} />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eintragstyp</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      form.reset({
                        ...getInitialFormValues(),
                        type: value as FormValues["type"],
                      }) as any;
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle einen Wartungstyp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="other">Allgemein</SelectItem>
                      <SelectItem value="repair">Reparatur</SelectItem>
                      <SelectItem value="fluids">Ölwechsel</SelectItem>
                      <SelectItem value="tire">Reifenwechsel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odometer"
                defaultValue={currentOdometer}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometerstand (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="z.B. 15000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {logType === "tire" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={"brand"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marke</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Michelin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"dotCode"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DOT-Code (4 Ziffern)</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. 0520" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={"position"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center gap-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="front" />
                          </FormControl>
                          <FormLabel className="font-normal">Vorne</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="rear" />
                          </FormControl>
                          <FormLabel className="font-normal">Hinten</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="sidecar" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Seitenwagen
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kosten (CHF)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="z.B. 150.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Beschreibung / Notizen</FormLabel>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreibe die durchgeführte Wartung..."
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between pt-4 -mx-4 px-4 pb-0 bg-background sticky bottom-0">
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
                        Eintrag wirklich löschen?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden.
                        Dadurch wird der Wartungseintrag dauerhaft gelöscht.
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
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit">
                  {isEditMode ? "Änderungen speichern" : "Eintrag speichern"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
