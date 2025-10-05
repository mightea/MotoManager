import { useEffect } from "react";
import { data, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { StorageLocationsForm } from "~/components/storage-locations-form";
import { CurrencySettingsForm } from "~/components/currency-settings-form";
import { getDb } from "~/db";
import { currencySettings, locations } from "~/db/schema";
import { useSettings } from "~/contexts/SettingsProvider";
import {
  DEFAULT_CURRENCY_CODE,
  FRANKFURTER_API_URL,
  findCurrencyPreset,
} from "~/constants";
import type { Route } from "./+types/settings";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings" }];
}

type FrankfurterResponse = {
  rates?: Record<string, number>;
};

async function fetchConversionRate(code: string) {
  if (code === DEFAULT_CURRENCY_CODE) {
    return 1;
  }

  const url = `${FRANKFURTER_API_URL}?from=${code}&to=${DEFAULT_CURRENCY_CODE}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    throw new Error(
      `Kurs für ${code} konnte nicht abgerufen werden: ${(error as Error).message}`
    );
  }

  if (!response.ok) {
    throw new Error(`Frankfurter API antwortete mit Status ${response.status}.`);
  }

  let payload: FrankfurterResponse;
  try {
    payload = (await response.json()) as FrankfurterResponse;
  } catch (error) {
    throw new Error("Antwort der Frankfurter API konnte nicht gelesen werden.");
  }

  const rate = payload?.rates?.[DEFAULT_CURRENCY_CODE];
  if (typeof rate !== "number" || Number.isNaN(rate)) {
    throw new Error("Kein gültiger Wechselkurs in der Antwort enthalten.");
  }

  return rate;
}

export async function loader({}: Route.LoaderArgs) {
  const db = await getDb();

  const [locationResult, currencyResult] = await Promise.all([
    db.query.locations.findMany(),
    db.query.currencySettings.findMany(),
  ]);

  return {
    locations: locationResult,
    currencies: currencyResult,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const db = await getDb();

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);

  const { intent } = fields;

  if (intent === "location-add") {
    const item = await db
      .insert(locations)
      .values({
        name: fields.name as string,
      })
      .returning();

    return data({
      success: true,
      name: item[0].name,
      intent: "location-add",
    });
  }

  if (intent === "location-edit") {
    const item = await db
      .update(locations)
      .set({
        name: fields.name as string,
      })
      .where(eq(locations.id, Number.parseInt(fields.id as string)))
      .returning();

    return data({
      success: true,
      name: item[0].name,
      intent: "location-edit",
    });
  }

  if (intent === "location-delete") {
    const removed = await db
      .delete(locations)
      .where(eq(locations.id, Number.parseInt(fields.id as string)))
      .returning();

    return data({
      success: true,
      intent: "location-delete",
      name: removed[0]?.name ?? (fields.name ? String(fields.name) : undefined),
    });
  }

  if (intent === "currency-add") {
    const code = String(fields.code ?? "").toUpperCase();
    const symbol = String(fields.symbol ?? "").trim();
    const label = String(fields.label ?? "").trim();

    if (!/^[A-Z]{2,5}$/.test(code)) {
      return data({
        success: false,
        intent: "currency-add",
        message:
          "Der Währungscode muss aus 2 bis 5 Großbuchstaben bestehen.",
      });
    }

    if (!symbol || !label) {
      return data({
        success: false,
        intent: "currency-add",
        message: "Symbol und Bezeichnung sind erforderlich.",
      });
    }

    const existing = await db
      .select({ code: currencySettings.code })
      .from(currencySettings)
      .where(eq(currencySettings.code, code));

    if (existing.length > 0) {
      const preset = findCurrencyPreset(code);
      return data({
        success: false,
        intent: "currency-add",
        message: `${preset?.label ?? code} ist bereits hinterlegt.`,
      });
    }

    let conversionFactor: number;
    try {
      conversionFactor = await fetchConversionRate(code);
    } catch (error) {
      return data({
        success: false,
        intent: "currency-add",
        message:
          (error as Error).message ??
          "Der Wechselkurs konnte nicht abgerufen werden.",
      });
    }

    const inserted = await db
      .insert(currencySettings)
      .values({
        code,
        symbol,
        label,
        conversionFactor,
      })
      .returning();

    return data({
      success: true,
      intent: "currency-add",
      code: inserted[0].code,
      label: inserted[0].label,
      conversionFactor: inserted[0].conversionFactor,
    });
  }

  if (intent === "currency-edit") {
    const id = Number.parseInt(String(fields.id ?? ""), 10);
    const code = String(fields.code ?? "").toUpperCase();
    const symbol = String(fields.symbol ?? "").trim();
    const label = String(fields.label ?? "").trim();
    const conversionFactorRaw = String(fields.conversionFactor ?? "").trim();
    const conversionFactor = Number.parseFloat(conversionFactorRaw);

    if (!Number.isInteger(id)) {
      return data({
        success: false,
        intent: "currency-edit",
        message: "Unbekannte Währung.",
      });
    }

    if (!/^[A-Z]{2,5}$/.test(code)) {
      return data({
        success: false,
        intent: "currency-edit",
        message:
          "Der Währungscode muss aus 2 bis 5 Großbuchstaben bestehen.",
      });
    }

    if (!symbol || !label) {
      return data({
        success: false,
        intent: "currency-edit",
        message: "Symbol und Bezeichnung sind erforderlich.",
      });
    }

    if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
      return data({
        success: false,
        intent: "currency-edit",
        message: "Bitte gib einen gültigen, positiven Umrechnungsfaktor an.",
      });
    }

    const current = await db
      .select({
        id: currencySettings.id,
        code: currencySettings.code,
      })
      .from(currencySettings)
      .where(eq(currencySettings.id, id));

    const target = current.at(0);

    if (!target) {
      return data({
        success: false,
        intent: "currency-edit",
        message: "Die Währung wurde nicht gefunden.",
      });
    }

    if (
      target.code === DEFAULT_CURRENCY_CODE &&
      code !== DEFAULT_CURRENCY_CODE
    ) {
      return data({
        success: false,
        intent: "currency-edit",
        message: "Der Code der Standardwährung kann nicht geändert werden.",
      });
    }

    const duplicates = await db
      .select({
        id: currencySettings.id,
        code: currencySettings.code,
      })
      .from(currencySettings)
      .where(eq(currencySettings.code, code));

    if (duplicates.some((entry) => entry.id !== id)) {
      const preset = findCurrencyPreset(code);
      return data({
        success: false,
        intent: "currency-edit",
        message: `${preset?.label ?? code} ist bereits hinterlegt.`,
      });
    }

    const enforcedConversionFactor =
      target.code === DEFAULT_CURRENCY_CODE ? 1 : conversionFactor;

    const updated = await db
      .update(currencySettings)
      .set({
        code,
        symbol,
        label,
        conversionFactor: enforcedConversionFactor,
      })
      .where(eq(currencySettings.id, id))
      .returning();

    return data({
      success: true,
      intent: "currency-edit",
      code: updated[0].code,
      label: updated[0].label,
      conversionFactor: updated[0].conversionFactor,
    });
  }

  if (intent === "currency-delete") {
    const code = String(fields.code ?? "").toUpperCase();

    if (code === DEFAULT_CURRENCY_CODE) {
      return data({
        success: false,
        intent: "currency-delete",
        message: "Die Standardwährung kann nicht entfernt werden.",
      });
    }

    const removed = await db
      .delete(currencySettings)
      .where(eq(currencySettings.code, code))
      .returning();

    if (removed.length === 0) {
      return data({
        success: false,
        intent: "currency-delete",
        message: "Die Währung konnte nicht entfernt werden.",
      });
    }

    return data({
      success: true,
      intent: "currency-delete",
      code: removed[0].code,
      label: removed[0].label,
    });
  }

  if (intent === "currency-refresh") {
    const currentCurrencies = await db.select().from(currencySettings);
    const refreshable = currentCurrencies.filter(
      (currency) => currency.code !== DEFAULT_CURRENCY_CODE
    );

    if (refreshable.length === 0) {
      return data({
        success: true,
        intent: "currency-refresh",
        updated: 0,
      });
    }

    const updates: Array<{ id: number; conversionFactor: number; code: string }> = [];

    for (const currency of refreshable) {
      try {
        const rate = await fetchConversionRate(currency.code);
        updates.push({
          id: currency.id,
          conversionFactor: rate,
          code: currency.code,
        });
      } catch (error) {
        return data({
          success: false,
          intent: "currency-refresh",
          message:
            (error as Error).message ??
            `Der Kurs für ${currency.code} konnte nicht aktualisiert werden.`,
        });
      }
    }

    for (const update of updates) {
      await db
        .update(currencySettings)
        .set({ conversionFactor: update.conversionFactor })
        .where(eq(currencySettings.id, update.id));
    }

    return data({
      success: true,
      intent: "currency-refresh",
      updated: updates.length,
    });
  }
}

export default function Settings() {
  const { locations: loaderLocations, currencies: loaderCurrencies } =
    useLoaderData<typeof loader>();
  const { setLocations, setCurrencies } = useSettings();

  useEffect(() => {
    setLocations(loaderLocations);
    setCurrencies(loaderCurrencies);
  }, [loaderLocations, loaderCurrencies, setLocations, setCurrencies]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="rounded-2xl border border-border/60 bg-background/95 px-6 py-8 shadow-lg backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3">
          <p className="text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
            App-Einstellungen
          </p>
          <h1 className="text-3xl font-headline font-semibold text-foreground">
            Einstellungen
          </h1>
          <p className="text-sm text-muted-foreground md:max-w-2xl">
            Verwalte Standorte, Währungen und weitere Präferenzen für dein
            Motobase-Konto.
          </p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full border-border/60 bg-white/90 shadow-md backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Garagen & Standorte
            </CardTitle>
            <CardDescription>
              Organisiere die Orte, an denen deine Motorräder stehen oder
              gewartet werden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StorageLocationsForm />
          </CardContent>
        </Card>

        <Card className="h-full border-border/60 bg-white/90 shadow-md backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Währungen</CardTitle>
            <CardDescription>
              Lege fest, welche Währungen du für Kosten und Preise verwenden
              möchtest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurrencySettingsForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
