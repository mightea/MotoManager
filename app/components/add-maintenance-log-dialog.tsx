import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
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
import type {
  BatteryType,
  FluidType,
  MaintenanceRecord,
  MaintenanceType,
  Motorcycle,
  OilType,
} from "~/db/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { AlertDialogCancel } from "@radix-ui/react-alert-dialog";
import { dateInputString } from "~/utils/dateUtils";
import { getMaintenanceIcon } from "~/utils/motorcycleUtils";
import { useSettings } from "~/contexts/SettingsProvider";

const maintenanceTypes: { value: MaintenanceType; label: string }[] = [
  { value: "service", label: "Service" },
  { value: "inspection", label: "Inspektion" },
  { value: "repair", label: "Reparatur" },
  { value: "general", label: "Allgemein" },
  { value: "fluid", label: "Flüssigkeitswechsel" },
  { value: "tire", label: "Reifenwechsel" },
  { value: "chain", label: "Kette" },
  { value: "brakepad", label: "Bremsbeläge" },
  { value: "brakerotor", label: "Bremsscheiben" },
  { value: "battery", label: "Batterie" },
];

export const fluidTypes: { value: FluidType; label: string }[] = [
  { value: "engineoil", label: "Motoröl" },
  { value: "breakfluid", label: "Bremsflüssigkeit" },
  { value: "gearboxoil", label: "Getriebeöl" },
  { value: "finaldriveoil", label: "Kardanantrieb" },
  { value: "driveshaftoil", label: "Kardanwelle" },
  { value: "forkoil", label: "Gabelöl" },
  { value: "coolant", label: "Kühlmittel" },
];

const oilTypes: { value: OilType; label: string }[] = [
  { value: "mineral", label: "Mineralisch" },
  { value: "semi-synthetic", label: "Teilsynthetisch" },
  { value: "synthetic", label: "Vollsynthetisch" },
];

const batteryTypes: { value: BatteryType; label: string }[] = [
  { value: "lead-acid", label: "Blei-Säure" },
  { value: "gel", label: "Gel" },
  { value: "agm", label: "AGM" },
  { value: "lithium-ion", label: "Lithium-Ionen" },
  { value: "other", label: "Andere" },
];

// Base schema for common fields
const baseSchema = z.object({
  date: z.string().min(1, "Ein Datum ist erforderlich."),
  odo: z.coerce.number().min(1, "Der Kilometerstand muss größer als 0 sein."),
  cost: z.coerce.number(),
  description: z
    .string()
    .max(1000, "Die Beschreibung darf nicht länger als 1000 Zeichen sein."),
  currencyCode: z.string().min(1, "Währung ist erforderlich."),
});

// Schemas for each log type
const generalLogSchema = baseSchema.extend({
  type: z.literal("general"),
});

const repairLogSchema = baseSchema.extend({
  type: z.literal("repair"),
});

const fluidChangeLogSchema = baseSchema.extend({
  type: z.literal("fluid"),
  fluidType: z.enum([
    "engineoil",
    "gearboxoil",
    "finaldriveoil",
    "driveshaftoil",
    "forkoil",
    "breakfluid",
    "coolant",
  ] as const),
  brand: z.string().min(2, "Marke ist erforderlich."),
  viscosity: z.string().min(2, "Viskosität ist erforderlich."),
  oilType: z
    .enum(["mineral", "semi-synthetic", "synthetic"] as const)
    .nullable(),
});

const tireChangeLogSchema = baseSchema.extend({
  type: z.literal("tire"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  model: z.string().min(2, "Modell ist erforderlich."),
  tirePosition: z.enum(["front", "rear", "sidecar"] as const),
  tireSize: z.string().optional(),
  dotCode: z
    .string()
    .min(4, "DOT-Code ist erforderlich.")
    .max(4, "Der DOT-Code muss 4 Ziffern haben."),
});

const batteryChangeLogSchema = baseSchema.extend({
  type: z.literal("battery"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  model: z.string().min(2, "Modell ist erforderlich."),
  batteryType: z.enum([
    "lead-acid",
    "gel",
    "agm",
    "lithium-ion",
    "other",
  ] as const),
});

const brakePadChangeLogSchema = baseSchema.extend({
  type: z.literal("brakepad"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  position: z.enum(["front", "rear"] as const),
});

const brakeRotorChangeLogSchema = baseSchema.extend({
  type: z.literal("brakerotor"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  position: z.enum(["front", "rear"] as const),
});

const chainChangeLogSchema = baseSchema.extend({
  type: z.literal("chain"),
  brand: z.string().min(2, "Marke ist erforderlich."),
  //  chainType: z.enum(["standard", "o-ring", "x-ring"], {
  //     required_error: "Kettentyp ist erforderlich.",
  //  }),
});

const inspectionLogSchema = baseSchema.extend({
  type: z.literal("inspection"),
  inspectionLocation: z.string().min(2, "Ort ist erforderlich."),
});

const formSchema = z.discriminatedUnion("type", [
  generalLogSchema,
  repairLogSchema,
  fluidChangeLogSchema,
  tireChangeLogSchema,
  batteryChangeLogSchema,
  brakePadChangeLogSchema,
  brakeRotorChangeLogSchema,
  chainChangeLogSchema,
  inspectionLogSchema,
]);

type FormSchema = typeof formSchema;
type FormValues = z.input<FormSchema>;
type FormOutput = z.output<FormSchema>;

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
  const { currencies } = useSettings();

  const getInitialFormValues = (): FormValues => {
    if (isEditMode && logToEdit) {
      const baseValues = {
        type: logToEdit.type,
        date: dateInputString(logToEdit.date),
        odo: logToEdit.odo,
        cost: logToEdit.cost ?? 0.0,
        description: logToEdit.description ?? "",
        currencyCode: logToEdit.currency ?? motorcycle.currencyCode ?? "CHF",
      };

      switch (logToEdit.type) {
        case "tire":
          return {
            ...baseValues,
            type: "tire",
            brand: logToEdit.brand ?? "",
            model: logToEdit.model ?? "",
            tirePosition: logToEdit.tirePosition ?? "front",
            tireSize: logToEdit.tireSize ?? "",
            dotCode: logToEdit.dotCode ?? "",
          };
        case "battery":
          return {
            ...baseValues,
            type: "battery",
            brand: logToEdit.brand ?? "",
            model: logToEdit.model ?? "",
            batteryType: logToEdit.batteryType ?? "agm",
          };
        case "fluid":
          return {
            ...baseValues,
            type: "fluid",
            fluidType: logToEdit.fluidType ?? "engineoil",
            brand: logToEdit.brand ?? "",
            viscosity: logToEdit.viscosity ?? "",
            oilType: logToEdit.oilType,
          };
        case "inspection":
          return {
            ...baseValues,
            type: "inspection",
            inspectionLocation: logToEdit.inspectionLocation ?? "",
          };
        case "general":
        default:
          return { ...baseValues, type: "general" };
      }
    }
    return {
      type: "general",
      date: format(new Date(), "yyyy-MM-dd"),
      cost: 0.0,
      odo: currentOdometer ?? 0,
      description: "",
      currencyCode: motorcycle.currencyCode ?? "CHF",
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
      { intent: "maintenance-delete", logId: logToEdit?.id ?? "" },
      { method: "post" },
    );

    setOpen(false);
  };

  const onSubmit = (values: FormValues) => {
    const parsed = formSchema.parse(values) as FormOutput;
    const formData = new FormData();

    formData.append(
      "intent",
      isEditMode ? "maintenance-edit" : "maintenance-add",
    );
    formData.append("maintenanceId", (logToEdit?.id ?? "").toString());
    formData.append("motorcycleId", motorcycle.id.toString());

    Object.entries(parsed).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      formData.append(key, String(value));
    });

    fetcher.submit(formData, { method: "post" });
  };

  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
  };

  const showOilTypeField = (ft: FluidType | undefined): boolean => {
    switch (ft) {
      case "engineoil":
      case "gearboxoil":
      case "finaldriveoil":
      case "driveshaftoil":
      case "forkoil":
        return true;
      default:
        return false;
    }
  };

  useEffect(() => {
    // Check if the submission is complete and was successful.
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setOpen(false); // Close the dialog
    }
  }, [fetcher]);

  const logType = form.watch("type");
  const fluidType = form.watch("fluidType");

  const mainContent = (
    <>
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
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="flex h-full flex-col gap-4"
        >
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 sm:pr-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eintragstyp</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wähle einen Wartungstyp" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maintenanceTypes.map((item) => {
                        return (
                          <SelectItem key={item.value} value={item.value}>
                            <div className="flex items-center gap-3">
                              {getMaintenanceIcon({
                                type: item.value,
                                className: "h-4 w-4 text-muted-foreground",
                              })}
                              <span>{item.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
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
                name="odo"
                defaultValue={currentOdometer}
                render={({ field }) => {
                  const value =
                    field.value === undefined || field.value === null
                      ? ""
                      : (field.value as number | string);

                  return (
                    <FormItem>
                      <FormLabel>Kilometerstand (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
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

            {/* Tire specific fields */}
            {logType === "tire" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={"brand"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marke</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Continental" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"model"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modell</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Trail Attack 3" {...field} />
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

                  <FormField
                    control={form.control}
                    name="tireSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reifengrösse</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. 120/70ZR17" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={"tirePosition"}
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

            {/* Tire specific fields */}
            {logType === "battery" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="batteryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batterietyp</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Typ wählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {batteryTypes.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
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
                    name={"brand"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marke</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Banner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={"model"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modell</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Power Bull" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {logType === "fluid" && (
              <>
                <FormField
                  control={form.control}
                  name="fluidType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flüssigkeit</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Flüssigkeit wählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fluidTypes.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showOilTypeField(fluidType) && (
                  <FormField
                    control={form.control}
                    name="oilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Öltyp</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Öltyp wählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {oilTypes.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marke</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Motul" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="viscosity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Viskosität</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. 10W-40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {logType === "inspection" && (
              <FormField
                control={form.control}
                name="inspectionLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ort der Inspektion</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. TCS Zürich" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => {
                const value =
                  field.value === undefined || field.value === null
                    ? ""
                    : (field.value as number | string);

                return (
                  <FormItem>
                    <FormLabel>Kosten</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="z.B. 150.00"
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
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Währung</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Währung wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.code}>
                          {currency.code} - {currency.label}
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
          </div>
          <DialogFooter className="sm:justify-between pt-4">
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
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-full max-h-screen flex-col overflow-y-auto sm:max-w-[520px] md:h-auto md:max-h-[90vh] md:flex-none md:overflow-y-visible">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}
