import { useState, type ReactNode, useEffect, useMemo } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { differenceInDays } from "date-fns/differenceInDays";
import { differenceInMonths } from "date-fns/differenceInMonths";
import { de } from "date-fns/locale/de";

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
import { useSettings } from "~/contexts/SettingsProvider";
import {
  useMotorcycle,
  type CurrentLocationWithName,
} from "~/contexts/MotorcycleProvider";
import { useFetcher } from "react-router";
import { toast } from "~/hooks/use-toast";
import { Separator } from "./ui/separator";

const UNKNOWN_LOCATION_LABEL = "Unbekannter Standort";

function safeParseDate(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDurationInGerman(start: Date, end: Date) {
  const months = differenceInMonths(end, start);
  if (months >= 1) {
    return months === 1 ? "1 Monat" : `${months} Monate`;
  }

  const days = Math.max(0, differenceInDays(end, start));
  if (days === 0) return "weniger als 1 Tag";
  if (days === 1) return "1 Tag";
  return `${days} Tage`;
}

const formSchema = z.object({
  storageLocationId: z.string().optional(),
  odometer: z.coerce
    .number()
    .min(0, "Kilometerstand muss eine positive Zahl sein."),
  date: z.string().min(1, "Datum ist erforderlich."),
});

type FormValues = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

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
  const { locations: storageLocations } = useSettings();
  const {
    setCurrentLocation,
    setCurrentOdo,
    locationHistory,
    setLocationHistory,
  } = useMotorcycle();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storageLocationId: "",
      odometer: currentOdometer,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const fetcher = useFetcher();

  const onSubmit = (values: FormValues) => {
    const parsed = formSchema.parse(values) as FormOutput;
    const formData = new FormData();
    formData.append("intent", "location-update");
    formData.append("motorcycleId", motorcycle.id.toString());

    if (parsed.storageLocationId) {
      formData.append("storageLocationId", parsed.storageLocationId);
      formData.append("locationId", parsed.storageLocationId);
    } else {
      formData.append("storageLocationId", "");
      formData.append("locationId", "");
    }

    formData.append("odometer", String(parsed.odometer));
    formData.append("date", parsed.date);

    fetcher.submit(formData, { method: "post" });
  };

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }

    const { intent, location } = fetcher.data as {
      intent?: string;
      location?: CurrentLocationWithName;
    };

    if (intent === "location-update") {
      if (location) {
        setCurrentLocation(location);
        if (typeof location.odometer === "number") {
          setCurrentOdo(location.odometer);
        }
        setLocationHistory((prev) => {
          const withoutInserted = prev.filter(
            (entry) => entry.id !== location.id,
          );
          return [location, ...withoutInserted];
        });
      }

      toast({
        title: "Standort aktualisiert",
        description: location?.locationName
          ? `Der Standort "${location.locationName}" wurde gespeichert.`
          : "Der Standort wurde gespeichert.",
      });

      setOpen(false);
    }
  }, [fetcher.data, fetcher.state, setCurrentLocation, setLocationHistory]);

  const historyItems = useMemo(() => {
    return locationHistory.map((entry, index) => {
      const startDate = safeParseDate(entry.date);
      if (!startDate) {
        return {
          id: entry.id,
          name: entry.locationName ?? UNKNOWN_LOCATION_LABEL,
          dateLabel: "-",
          durationLabel: "-",
          odometer: entry.odometer,
        };
      }

      const previousEntry = index === 0 ? null : locationHistory[index - 1];
      const endDate = previousEntry
        ? (safeParseDate(previousEntry.date) ?? startDate)
        : new Date();

      const dateLabel = format(startDate, "d. MMM yyyy", { locale: de });
      const durationLabel = formatDurationInGerman(startDate, endDate);

      return {
        id: entry.id,
        name: entry.locationName ?? UNKNOWN_LOCATION_LABEL,
        dateLabel,
        durationLabel,
        odometer: entry.odometer,
      };
    });
  }, [locationHistory]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Standort aktualisieren</DialogTitle>
          <DialogDescription>
            Aktualisiere den aktuellen Standort für deine {motorcycle.make}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <SelectItem key={location.id} value={`${location.id}`}>
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
              name="odometer"
              render={({ field }) => {
                const value =
                  field.value === undefined || field.value === null
                    ? ""
                    : (field.value as number | string);

                return (
                  <FormItem>
                    <FormLabel>Aktueller Kilometerstand</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

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
        {historyItems.length > 0 && (
          <div className="mt-6 space-y-4">
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Bisherige Standorte
              </h3>
              <ul className="mt-3 space-y-2">
                {historyItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.dateLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Kilometerstand:
                      <span className="font-medium">
                        {typeof item.odometer === "number"
                          ? ` ${item.odometer.toLocaleString("de-CH")} km`
                          : " –"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Dauer: {item.durationLabel}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
