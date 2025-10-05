import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Edit, PlusCircle, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { useSettings } from "~/contexts/SettingsProvider";
import { DEFAULT_CURRENCY_CODE, findCurrencyPreset } from "~/constants";
import { useFetcher } from "react-router";
import {
  AddCurrencyDialog,
  EditCurrencyDialog,
} from "~/components/currency-dialog";

interface CurrencySettingsFormProps {
  canEdit: boolean;
}

export function CurrencySettingsForm({ canEdit }: CurrencySettingsFormProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { currencies } = useSettings();
  const { toast } = useToast();
  const fetcher = useFetcher();
  const refreshFetcher = useFetcher();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const conversionFormatter = useMemo(
    () =>
      new Intl.NumberFormat("de-CH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
    []
  );

  const formatConversion = (value: number) => conversionFormatter.format(value);

  const handleRemoveCurrency = (code: string) => {
    if (!canEdit) {
      return;
    }
    fetcher.submit(
      {
        intent: "currency-delete",
        code,
      },
      { method: "post" }
    );
  };

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }

    const result = fetcher.data as {
      success: boolean;
      intent: string;
      label?: string | null;
      code?: string;
      message?: string;
    };

    if (!result.success) {
      toast({
        title: "Aktion fehlgeschlagen",
        description: result.message ?? "Bitte versuche es erneut.",
        variant: "destructive",
      });
      return;
    }

    switch (result.intent) {
      case "currency-add":
        toast({
          title: "Währung hinzugefügt",
          description: `${result.label ?? result.code} wurde deinen Einstellungen hinzugefügt.`,
        });
        break;
      case "currency-edit":
        toast({
          title: "Währung aktualisiert",
          description: `${result.label ?? result.code} wurde aktualisiert.`,
        });
        break;
      case "currency-delete":
        toast({
          title: "Währung entfernt",
          description: result.label
            ? `${result.label} wurde entfernt.`
            : "Die Währung wurde entfernt.",
          variant: "destructive",
        });
        break;
    }
  }, [fetcher.state, fetcher.data, toast]);

  const currencyLabel = (code: string) =>
    findCurrencyPreset(code)?.label ?? code;

  const isDeletingCurrency = (code: string) => {
    if (fetcher.state === "idle") {
      return false;
    }

    return (
      fetcher.formData?.get("intent") === "currency-delete" &&
      fetcher.formData?.get("code") === code
    );
  };

  const isEditingCurrency = (id: number) => {
    if (fetcher.state === "idle") {
      return false;
    }

    if (fetcher.formData?.get("intent") !== "currency-edit") {
      return false;
    }

    const formId = Number.parseInt(String(fetcher.formData?.get("id") ?? ""), 10);
    return Number.isFinite(formId) && formId === id;
  };

  useEffect(() => {
    if (refreshFetcher.state !== "idle" || !refreshFetcher.data) {
      return;
    }

    const result = refreshFetcher.data as {
      success: boolean;
      intent: string;
      updated?: number;
      message?: string;
    };

    if (!result.success) {
      toast({
        title: "Aktualisierung fehlgeschlagen",
        description:
          result.message ?? "Die Wechselkurse konnten nicht aktualisiert werden.",
        variant: "destructive",
      });
      return;
    }

    const updatedCount = result.updated ?? 0;
    toast({
      title: "Wechselkurse aktualisiert",
      description:
        updatedCount === 0
          ? "Es waren keine weiteren Währungen zu aktualisieren."
          : `${updatedCount} Wechselkurs${updatedCount === 1 ? "" : "e"} aktualisiert.`,
    });
  }, [refreshFetcher.state, refreshFetcher.data, toast]);

  const handleRefreshRates = () => {
    if (!canEdit) {
      return;
    }
    refreshFetcher.submit({ intent: "currency-refresh" }, { method: "post" });
  };

  const isRefreshing = refreshFetcher.state !== "idle";
  const hasRefreshableCurrencies = currencies.some(
    (currency) => currency.code !== DEFAULT_CURRENCY_CODE
  );

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Noch keine Währungen hinterlegt</p>
              <p className="text-sm text-muted-foreground">
                Füge eine Währung hinzu, um Beträge konsistent darzustellen.
              </p>
            </div>
          </div>
        ) : (
          currencies.map((currency) => {
            const isDefaultCurrency =
              currency.code === DEFAULT_CURRENCY_CODE;
            const existingCodes = currencies
              .filter((item) => item.id !== currency.id)
              .map((item) => item.code);

            return (
              <div
                key={currency.id}
                className="flex items-center justify-between rounded-lg border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {currency.label ?? currencyLabel(currency.code)}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold tracking-tight">
                        {currency.code}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {currency.symbol}
                      </Badge>
                    </div>
                    {isDefaultCurrency && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                        Standard
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1 {currency.code} = {formatConversion(currency.conversionFactor)}{' '}
                    {DEFAULT_CURRENCY_CODE}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <EditCurrencyDialog
                      fetcher={fetcher}
                      existingCodes={existingCodes}
                      currency={currency}
                      disableCode={isDefaultCurrency}
                      disableConversionFactor={isDefaultCurrency}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isEditingCurrency(currency.id)}
                          aria-label={`${currency.code} bearbeiten`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                  ) : null}
                  {isDefaultCurrency ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Basiswährung
                    </span>
                  ) : canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCurrency(currency.code)}
                      disabled={
                        isDeletingCurrency(currency.code) ||
                        isEditingCurrency(currency.id)
                      }
                      aria-label={`${currency.code} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <AddCurrencyDialog
            fetcher={fetcher}
            existingCodes={currencies.map((currency) => currency.code)}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleRefreshRates}
            disabled={
              isRefreshing ||
              !hasRefreshableCurrencies ||
              fetcher.state !== "idle"
            }
          >
            <RotateCcw
              className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Wechselkurse aktualisieren
          </Button>
        </div>
      )}
    </div>
  );
}
