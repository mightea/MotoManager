"use client";

import { useState, type ReactNode } from "react";
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
import { useToast } from "~/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type { Motorcycle } from "~/db/schema";

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
  type: z.literal("general"),
});

const oilChangeLogSchema = baseSchema.extend({
  type: z.literal("oil_change"),
  oilType: z.enum(["engine", "gear"], {
    required_error: "Öltyp ist erforderlich.",
  }),
  brand: z.string().min(2, "Marke ist erforderlich."),
  viscosity: z.string().min(2, "Viskosität ist erforderlich."),
  synthetic: z.boolean().default(false),
});

const tireChangeLogSchema = baseSchema.extend({
  type: z.literal("tire_change"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  position: z.enum(["front", "rear", "sidecar"], {
    required_error: "Reifenposition ist erforderlich.",
  }),
  dotCode: z
    .string()
    .min(4, "DOT-Code ist erforderlich.")
    .max(4, "Der DOT-Code muss 4 Ziffern haben."),
});

const brakeFluidLogSchema = baseSchema.extend({
  type: z.literal("brake_fluid_change"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  viscosity: z.string().min(2, "Viskosität/Typ ist erforderlich."),
  synthetic: z.boolean().default(false),
});

const formSchema = z.discriminatedUnion("type", [
  generalLogSchema,
  oilChangeLogSchema,
  tireChangeLogSchema,
  brakeFluidLogSchema,
]);

type FormValues = z.infer<typeof formSchema>;

type AddMaintenanceLogDialogProps = {
  children: ReactNode;
  motorcycle: Motorcycle;
  currentOdometer: number;
};

export function AddMaintenanceLogDialog({
  children,
  motorcycle,
  currentOdometer,
}: AddMaintenanceLogDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const defaultFormValues: Partial<FormValues> = {
    type: "general",
    date: format(new Date(), "yyyy-MM-dd"),
    cost: 0,
    description: "",
    odometer: currentOdometer,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues as FormValues,
  });

  const logType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Neuen Wartungseintrag hinzufügen</DialogTitle>
          <DialogDescription>
            {`Erfasse einen neuen Service oder eine Reparatur für deine ${motorcycle.make} ${motorcycle.model}.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form method="post" className="space-y-4">
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
                        ...defaultFormValues,
                        type: value as FormValues["type"],
                      });
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle einen Wartungstyp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">Allgemein</SelectItem>
                      <SelectItem value="repair">Reparatur</SelectItem>
                      <SelectItem value="oil_change">Ölwechsel</SelectItem>
                      <SelectItem value="tire_change">Reifenwechsel</SelectItem>
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

            {logType === "tire_change" && (
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" name="intent" value={"maintenance-add"}>
                Eintrag speichern
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
