import { useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FetcherWithComponents } from "react-router";
import { PlusCircle, PencilLine } from "lucide-react";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  DEFAULT_CURRENCY_CODE,
  FRANKFURTER_API_URL,
  findCurrencyPreset,
} from "~/constants";
import type { Currency } from "~/contexts/SettingsProvider";

const formSchema = z.object({
  code: z
    .string()
    .min(2, "Der Währungscode muss mindestens 2 Zeichen haben.")
    .max(5, "Der Währungscode darf höchstens 5 Zeichen haben.")
    .regex(/^[A-Z]+$/, "Bitte nur Großbuchstaben verwenden."),
  symbol: z.string().min(1, "Bitte gib ein Symbol an."),
  label: z
    .string()
    .min(2, "Die Bezeichnung sollte mindestens 2 Zeichen lang sein."),
  conversionFactor: z.coerce
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Bitte gib eine gültige Zahl ein.",
    })
    .positive("Der Umrechnungsfaktor muss größer als 0 sein."),
});

type SharedProps = {
  fetcher: FetcherWithComponents<any>;
  existingCodes: string[];
  disableCode?: boolean;
  disableConversionFactor?: boolean;
};

type AddDialogProps = SharedProps & {
  mode: "add";
  trigger?: ReactNode;
};

type EditDialogProps = SharedProps & {
  mode: "edit";
  currency: Currency;
  trigger: ReactNode;
};

type CurrencyDialogProps = AddDialogProps | EditDialogProps;

type FormValues = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const defaultValues: FormValues = {
  code: "",
  symbol: "",
  label: "",
  conversionFactor: 1,
};

export function CurrencyDialog(props: CurrencyDialogProps) {
  const {
    fetcher,
    existingCodes,
    disableCode = false,
    disableConversionFactor = false,
  } = props;
  const isEdit = props.mode === "edit";
  const isAdd = !isEdit;
  const currency = isEdit ? props.currency : undefined;

  const [open, setOpen] = useState(false);

  const initialValues = useMemo<FormValues>(() => {
    if (isEdit && currency) {
      return {
        code: currency.code,
        symbol: currency.symbol,
        label: currency.label ?? "",
        conversionFactor: disableConversionFactor
          ? 1
          : (currency.conversionFactor ?? 1),
      };
    }
    return { ...defaultValues };
  }, [isEdit, currency, disableConversionFactor]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const selectedCode = form.watch("code");
  const watchedConversionFactor = form.watch("conversionFactor");
  const conversionFormatter = useMemo(
    () =>
      new Intl.NumberFormat("de-CH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }),
    [],
  );
  const numericConversionFactor =
    typeof watchedConversionFactor === "number"
      ? watchedConversionFactor
      : Number.parseFloat(String(watchedConversionFactor ?? ""));

  const [rateStatus, setRateStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.reset(initialValues);
    } else {
      form.reset(initialValues);
    }
  }, [open, initialValues]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data as {
        success: boolean;
        intent: string;
      };

      const isSuccessIntent = isEdit
        ? result.intent === "currency-edit"
        : result.intent === "currency-add";

      if (isSuccessIntent && result.success) {
        setOpen(false);
      }
    }
  }, [fetcher.state, fetcher.data, open, isEdit]);

  const normalizedExistingCodes = useMemo(
    () => existingCodes.map((code) => code.toUpperCase()),
    [existingCodes],
  );

  const isSubmitting =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") ===
      (isEdit ? "currency-edit" : "currency-add");

  useEffect(() => {
    if (!open || isEdit) {
      setRateStatus("idle");
      setRateError(null);
      return;
    }

    const code = (selectedCode ?? "").toUpperCase();

    if (!code) {
      setRateStatus("idle");
      setRateError(null);
      form.setValue("conversionFactor", 1, {
        shouldValidate: true,
        shouldDirty: false,
      });
      return;
    }

    if (code === DEFAULT_CURRENCY_CODE) {
      form.setValue("conversionFactor", 1, {
        shouldValidate: true,
        shouldDirty: false,
      });
      setRateStatus("success");
      setRateError(null);
      return;
    }

    if (code.length < 2) {
      setRateStatus("idle");
      setRateError(null);
      return;
    }

    const controller = new AbortController();
    setRateStatus("loading");
    setRateError(null);

    fetch(`${FRANKFURTER_API_URL}?from=${code}&to=${DEFAULT_CURRENCY_CODE}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        return response.json();
      })
      .then((payload: { rates?: Record<string, number> }) => {
        const rate = payload?.rates?.[DEFAULT_CURRENCY_CODE];
        if (typeof rate !== "number" || Number.isNaN(rate)) {
          throw new Error("Rate missing");
        }
        form.setValue("conversionFactor", rate, {
          shouldValidate: true,
          shouldDirty: false,
        });
        setRateStatus("success");
        setRateError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Frankfurter Fetch", error);
        setRateStatus("error");
        setRateError("Kurs konnte nicht geladen werden.");
      });

    return () => controller.abort();
  }, [open, isEdit, selectedCode, form]);

  const handleCodeChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z]/g, "");
    form.clearErrors("code");
    form.setValue("code", sanitized, {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (!sanitized) {
      return;
    }

    const preset = findCurrencyPreset(sanitized);
    if (!preset) {
      return;
    }

    if (!form.formState.dirtyFields.symbol) {
      form.setValue("symbol", preset.symbol, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
    if (!form.formState.dirtyFields.label) {
      form.setValue("label", preset.label, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
    if (!form.formState.dirtyFields.conversionFactor) {
      form.setValue("conversionFactor", preset.conversionFactor, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  };

  const handleSubmit = (values: FormValues) => {
    const parsed = formSchema.parse(values) as FormOutput;
    const normalizedCode = disableCode
      ? (currency?.code ?? parsed.code.trim().toUpperCase())
      : parsed.code.trim().toUpperCase();

    if (!disableCode && normalizedExistingCodes.includes(normalizedCode)) {
      form.setError("code", {
        type: "manual",
        message: "Diese Währung ist bereits vorhanden.",
      });
      return;
    }

    const payload: Record<string, string> = {
      intent: isEdit ? "currency-edit" : "currency-add",
      code: normalizedCode,
      symbol: parsed.symbol.trim(),
      label: parsed.label.trim(),
      conversionFactor: disableConversionFactor
        ? "1"
        : String(parsed.conversionFactor),
    };

    if (isEdit && currency) {
      payload.id = String(currency.id);
    }

    fetcher.submit(payload, { method: "post" });
  };

  const disableSubmit = isSubmitting || (isAdd && rateStatus === "loading");

  const conversionDescription = isEdit
    ? `Wie viele ${DEFAULT_CURRENCY_CODE} entspricht 1 ${selectedCode || "?"}?`
    : rateStatus === "loading"
      ? `Kurs für ${selectedCode || "?"} wird geladen …`
      : rateStatus === "error"
        ? (rateError ?? "Kurs konnte nicht geladen werden.")
        : `Der aktuelle Kurs wird automatisch über Frankfurter gesetzt.`;

  const triggerNode = (() => {
    if (props.mode === "edit") {
      return (
        props.trigger ?? (
          <Button variant="ghost" size="icon">
            <PencilLine className="h-4 w-4" />
          </Button>
        )
      );
    }

    return (
      props.trigger ?? (
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={isSubmitting}
        >
          <PlusCircle className="h-4 w-4" /> Währung hinzufügen
        </Button>
      )
    );
  })();

  const title = isEdit ? "Währung bearbeiten" : "Währung hinzufügen";
  const description = isEdit
    ? `Passe Symbol, Bezeichnung oder den Umrechnungsfaktor für ${currency?.code} an.`
    : "Lege Symbol, Bezeichnung und Umrechnung zur Standardwährung fest.";
  const submitLabel = isEdit ? "Aktualisieren" : "Speichern";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Währungscode</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="z.B. USD"
                      inputMode="text"
                      autoComplete="off"
                      maxLength={5}
                      disabled={disableCode || isSubmitting}
                      onChange={(event) =>
                        disableCode
                          ? field.onChange(field.value)
                          : handleCodeChange(event.target.value)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Verwende Großbuchstaben, z.B. &quot;USD&quot; oder
                    &quot;GBP&quot;.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. €"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bezeichnung</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Euro"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="conversionFactor"
              render={({ field }) => {
                const value =
                  field.value === undefined || field.value === null
                    ? ""
                    : (field.value as number | string);

                return (
                  <FormItem>
                    <FormLabel>
                      Umrechnungsfaktor zu {DEFAULT_CURRENCY_CODE}
                    </FormLabel>
                    <FormDescription>
                      {conversionDescription}
                      {isAdd &&
                        rateStatus === "success" &&
                        Number.isFinite(numericConversionFactor) && (
                          <span className="ml-1 font-medium">
                            (
                            {conversionFormatter.format(
                              numericConversionFactor,
                            )}{" "}
                            {DEFAULT_CURRENCY_CODE} für 1 {selectedCode || "?"})
                          </span>
                        )}
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.0001}
                        step="0.0001"
                        inputMode="decimal"
                        {...field}
                        value={value}
                        onChange={(event) => field.onChange(event.target.value)}
                        disabled={
                          disableConversionFactor || isSubmitting || isAdd
                        }
                        readOnly={isAdd || disableConversionFactor}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddCurrencyDialog({
  fetcher,
  existingCodes,
  trigger,
}: Omit<AddDialogProps, "mode">) {
  return (
    <CurrencyDialog
      mode="add"
      fetcher={fetcher}
      existingCodes={existingCodes}
      trigger={trigger}
    />
  );
}

export function EditCurrencyDialog({
  fetcher,
  existingCodes,
  currency,
  trigger,
  disableCode,
  disableConversionFactor,
}: Omit<EditDialogProps, "mode">) {
  return (
    <CurrencyDialog
      mode="edit"
      fetcher={fetcher}
      existingCodes={existingCodes}
      currency={currency}
      trigger={trigger}
      disableCode={disableCode}
      disableConversionFactor={disableConversionFactor}
    />
  );
}
