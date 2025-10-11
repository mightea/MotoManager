import { useEffect } from "react";
import { data, useLoaderData, useFetcher } from "react-router";
import { and, eq } from "drizzle-orm";
import path from "node:path";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { StorageLocationsForm } from "~/components/storage-locations-form";
import { CurrencySettingsForm } from "~/components/currency-settings-form";
import { UserManagementPanel } from "~/components/user-management-panel";
import { getDb } from "~/db";
import { currencySettings, documents, locations, users } from "~/db/schema";
import { useSettings } from "~/contexts/SettingsProvider";
import {
  DEFAULT_CURRENCY_CODE,
  FRANKFURTER_API_URL,
  findCurrencyPreset,
} from "~/constants";
import type { Route } from "./+types/settings";
import {
  createUser,
  deleteUser,
  listUsers,
  mergeHeaders,
  requireAdmin,
  requireUser,
  updateUserPassword,
  updateUserRole,
} from "~/services/auth.server";
import { USER_ROLES, type PublicUser, type UserRole } from "~/types/auth";
import {
  DOCUMENT_PREVIEWS_DIR,
  DOCUMENT_PREVIEWS_PUBLIC_BASE,
  ensureDocumentDirs,
  generatePdfPreview,
  resolvePublicFilePath,
} from "~/services/documentPreviews.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings" }];
}

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

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
      `Kurs für ${code} konnte nicht abgerufen werden: ${(error as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Frankfurter API antwortete mit Status ${response.status}.`,
    );
  }

  let payload: FrankfurterResponse;
  try {
    payload = (await response.json()) as FrankfurterResponse;
  } catch {
    throw new Error("Antwort der Frankfurter API konnte nicht gelesen werden.");
  }

  const rate = payload?.rates?.[DEFAULT_CURRENCY_CODE];
  if (typeof rate !== "number" || Number.isNaN(rate)) {
    throw new Error("Kein gültiger Wechselkurs in der Antwort enthalten.");
  }

  return rate;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const isAdmin = user.role === "admin";
  const [locationResult, currencyResult, usersList] = await Promise.all([
    db.query.locations.findMany({
      where: eq(locations.userId, user.id),
    }),
    db.query.currencySettings.findMany(),
    isAdmin ? listUsers() : Promise.resolve<PublicUser[]>([]),
  ]);

  return data(
    {
      locations: locationResult,
      currencies: currencyResult,
      users: usersList,
      canManageUsers: isAdmin,
      canEditCurrencies: isAdmin,
      currentUserId: user.id,
    },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers: sessionHeaders } = await requireUser(request);
  const db = await getDb();

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);

  const { intent } = fields;

  const headersRecord = sessionHeaders ?? {};
  const respond = (
    body: unknown,
    init?: ResponseInit & { headers?: HeadersInit },
  ) => {
    const headerFragments: Record<string, string>[] = [headersRecord];
    if (init?.headers) {
      const additional = new Headers(init.headers);
      const additionalRecord: Record<string, string> = {};
      additional.forEach((value, key) => {
        additionalRecord[key] = value;
      });
      headerFragments.push(additionalRecord);
    }

    const merged = mergeHeaders(...headerFragments);

    return data(body, {
      ...init,
      headers: merged,
    });
  };

  if (intent === "location-add") {
    const item = await db
      .insert(locations)
      .values({
        name: fields.name as string,
        userId: user.id,
      })
      .returning();

    return respond({
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
      .where(
        and(
          eq(locations.id, Number.parseInt(fields.id as string)),
          eq(locations.userId, user.id),
        ),
      )
      .returning();

    return respond({
      success: true,
      name: item[0].name,
      intent: "location-edit",
    });
  }

  if (intent === "location-delete") {
    const removed = await db
      .delete(locations)
      .where(
        and(
          eq(locations.id, Number.parseInt(fields.id as string)),
          eq(locations.userId, user.id),
        ),
      )
      .returning();

    return respond({
      success: true,
      intent: "location-delete",
      name: removed[0]?.name ?? (fields.name ? String(fields.name) : undefined),
    });
  }

  if (intent === "currency-add") {
    requireAdmin(user);
    const code = String(fields.code ?? "").toUpperCase();
    const symbol = String(fields.symbol ?? "").trim();
    const label = String(fields.label ?? "").trim();

    if (!/^[A-Z]{2,5}$/.test(code)) {
      return respond({
        success: false,
        intent: "currency-add",
        message: "Der Währungscode muss aus 2 bis 5 Großbuchstaben bestehen.",
      });
    }

    if (!symbol || !label) {
      return respond({
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
      return respond({
        success: false,
        intent: "currency-add",
        message: `${preset?.label ?? code} ist bereits hinterlegt.`,
      });
    }

    let conversionFactor: number;
    try {
      conversionFactor = await fetchConversionRate(code);
    } catch (error) {
      return respond({
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

    return respond({
      success: true,
      intent: "currency-add",
      code: inserted[0].code,
      label: inserted[0].label,
      conversionFactor: inserted[0].conversionFactor,
    });
  }

  if (intent === "documents-regenerate-previews") {
    requireAdmin(user);

    const docs = await db
      .select({
        id: documents.id,
        filePath: documents.filePath,
        previewPath: documents.previewPath,
      })
      .from(documents);

    await ensureDocumentDirs();

    let regenerated = 0;

    for (const doc of docs) {
      const absolutePdf = resolvePublicFilePath(doc.filePath);

      const previewFilename = doc.previewPath
        ? path.basename(doc.previewPath)
        : `${path.parse(doc.filePath).name}-preview.png`;

      const previewServerPath = path.join(
        DOCUMENT_PREVIEWS_DIR,
        previewFilename,
      );
      const previewPublicPath = path.posix.join(
        DOCUMENT_PREVIEWS_PUBLIC_BASE,
        previewFilename,
      );

      const success = await generatePdfPreview(absolutePdf, previewServerPath);

      if (!success) {
        continue;
      }

      regenerated += 1;

      if (doc.previewPath !== previewPublicPath) {
        await db
          .update(documents)
          .set({
            previewPath: previewPublicPath,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(documents.id, doc.id));
      }
    }

    return respond(
      {
        success: true,
        intent: "documents-regenerate-previews",
        regenerated,
        total: docs.length,
      },
      { status: 200 },
    );
  }

  if (intent === "currency-edit") {
    requireAdmin(user);
    const id = Number.parseInt(String(fields.id ?? ""), 10);
    const code = String(fields.code ?? "").toUpperCase();
    const symbol = String(fields.symbol ?? "").trim();
    const label = String(fields.label ?? "").trim();
    const conversionFactorRaw = String(fields.conversionFactor ?? "").trim();
    const conversionFactor = Number.parseFloat(conversionFactorRaw);

    if (!Number.isInteger(id)) {
      return respond({
        success: false,
        intent: "currency-edit",
        message: "Unbekannte Währung.",
      });
    }

    if (!/^[A-Z]{2,5}$/.test(code)) {
      return respond({
        success: false,
        intent: "currency-edit",
        message: "Der Währungscode muss aus 2 bis 5 Großbuchstaben bestehen.",
      });
    }

    if (!symbol || !label) {
      return respond({
        success: false,
        intent: "currency-edit",
        message: "Symbol und Bezeichnung sind erforderlich.",
      });
    }

    if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
      return respond({
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
      return respond({
        success: false,
        intent: "currency-edit",
        message: "Die Währung wurde nicht gefunden.",
      });
    }

    if (
      target.code === DEFAULT_CURRENCY_CODE &&
      code !== DEFAULT_CURRENCY_CODE
    ) {
      return respond({
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
      return respond({
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

    return respond({
      success: true,
      intent: "currency-edit",
      code: updated[0].code,
      label: updated[0].label,
      conversionFactor: updated[0].conversionFactor,
    });
  }

  if (intent === "currency-delete") {
    requireAdmin(user);
    const code = String(fields.code ?? "").toUpperCase();

    if (code === DEFAULT_CURRENCY_CODE) {
      return respond({
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
      return respond({
        success: false,
        intent: "currency-delete",
        message: "Die Währung konnte nicht entfernt werden.",
      });
    }

    return respond({
      success: true,
      intent: "currency-delete",
      code: removed[0].code,
      label: removed[0].label,
    });
  }

  if (intent === "currency-refresh") {
    requireAdmin(user);
    const currentCurrencies = await db.select().from(currencySettings);
    const refreshable = currentCurrencies.filter(
      (currency) => currency.code !== DEFAULT_CURRENCY_CODE,
    );

    if (refreshable.length === 0) {
      return respond({
        success: true,
        intent: "currency-refresh",
        updated: 0,
      });
    }

    const updates: Array<{
      id: number;
      conversionFactor: number;
      code: string;
    }> = [];

    for (const currency of refreshable) {
      try {
        const rate = await fetchConversionRate(currency.code);
        updates.push({
          id: currency.id,
          conversionFactor: rate,
          code: currency.code,
        });
      } catch (error) {
        return respond({
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

    return respond({
      success: true,
      intent: "currency-refresh",
      updated: updates.length,
    });
  }

  if (intent === "user-create") {
    requireAdmin(user);
    const name = String(fields.name ?? "").trim();
    const email = String(fields.email ?? "").trim();
    const username = String(fields.username ?? "").trim();
    const password = String(fields.password ?? "");
    const roleInput = String(fields.role ?? "user");

    if (name.length < 2) {
      return respond(
        {
          success: false,
          intent: "user-create",
          message: "Der Name muss mindestens 2 Zeichen lang sein.",
        },
        { status: 400 },
      );
    }

    if (!/.+@.+\..+/i.test(email)) {
      return respond(
        {
          success: false,
          intent: "user-create",
          message: "Bitte gib eine gültige E-Mail-Adresse ein.",
        },
        { status: 400 },
      );
    }

    if (!USERNAME_REGEX.test(username)) {
      return respond(
        {
          success: false,
          intent: "user-create",
          message:
            "Der Benutzername muss 3-32 Zeichen lang sein und darf nur Buchstaben, Zahlen sowie ._- enthalten.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return respond(
        {
          success: false,
          intent: "user-create",
          message: "Das Passwort muss mindestens 8 Zeichen haben.",
        },
        { status: 400 },
      );
    }

    if (!USER_ROLES.includes(roleInput as UserRole)) {
      return respond(
        {
          success: false,
          intent: "user-create",
          message: "Die ausgewählte Rolle ist ungültig.",
        },
        { status: 400 },
      );
    }

    try {
      const created = await createUser({
        name,
        email,
        username,
        password,
        role: roleInput as UserRole,
      });

      return respond({
        success: true,
        intent: "user-create",
        user: created,
      });
    } catch (error) {
      return respond(
        {
          success: false,
          intent: "user-create",
          message:
            (error instanceof Error && error.message) ||
            "Der Benutzer konnte nicht angelegt werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "user-update-role") {
    requireAdmin(user);
    const targetId = Number.parseInt(String(fields.userId ?? ""), 10);
    const roleInput = String(fields.role ?? "");

    if (!Number.isInteger(targetId)) {
      return respond(
        {
          success: false,
          intent: "user-update-role",
          message: "Der Benutzer konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    if (!USER_ROLES.includes(roleInput as UserRole)) {
      return respond(
        {
          success: false,
          intent: "user-update-role",
          message: "Die ausgewählte Rolle ist ungültig.",
        },
        { status: 400 },
      );
    }

    if (targetId === user.id && roleInput !== "admin") {
      return respond(
        {
          success: false,
          intent: "user-update-role",
          message: "Du kannst deine eigene Rolle nicht entfernen.",
        },
        { status: 400 },
      );
    }

    if (roleInput !== "admin") {
      const adminCount = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"));

      const lastAdmin =
        adminCount.length <= 1 && adminCount[0]?.id === targetId;
      if (lastAdmin) {
        return respond(
          {
            success: false,
            intent: "user-update-role",
            message: "Es muss mindestens ein Administrator bestehen bleiben.",
          },
          { status: 400 },
        );
      }
    }

    const updated = await updateUserRole(targetId, roleInput as UserRole);
    return respond({
      success: true,
      intent: "user-update-role",
      user: updated,
    });
  }

  if (intent === "user-reset-password") {
    const targetId = Number.parseInt(String(fields.userId ?? ""), 10);
    const password = String(fields.password ?? "");

    if (!Number.isInteger(targetId)) {
      return respond(
        {
          success: false,
          intent: "user-reset-password",
          message: "Der Benutzer konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return respond(
        {
          success: false,
          intent: "user-reset-password",
          message: "Das Passwort muss mindestens 8 Zeichen haben.",
        },
        { status: 400 },
      );
    }

    if (targetId !== user.id) {
      requireAdmin(user);
    }

    await updateUserPassword(targetId, password);

    return respond({
      success: true,
      intent: "user-reset-password",
      userId: targetId,
      isSelf: targetId === user.id,
    });
  }

  if (intent === "user-delete") {
    requireAdmin(user);
    const targetId = Number.parseInt(String(fields.userId ?? ""), 10);

    if (!Number.isInteger(targetId)) {
      return respond(
        {
          success: false,
          intent: "user-delete",
          message: "Der Benutzer konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    if (targetId === user.id) {
      return respond(
        {
          success: false,
          intent: "user-delete",
          message: "Du kannst dich nicht selbst entfernen.",
        },
        { status: 400 },
      );
    }

    const adminCount = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    const lastAdmin = adminCount.length <= 1 && adminCount[0]?.id === targetId;
    if (lastAdmin) {
      return respond(
        {
          success: false,
          intent: "user-delete",
          message: "Es muss mindestens ein Administrator bestehen bleiben.",
        },
        { status: 400 },
      );
    }

    await deleteUser(targetId);

    return respond({ success: true, intent: "user-delete", userId: targetId });
  }

  return respond(
    { success: false, message: `Unhandled intent ${intent}` },
    { status: 500 },
  );
}

export default function Settings() {
  const {
    locations: loaderLocations,
    currencies: loaderCurrencies,
    users: loaderUsers,
    canManageUsers,
    canEditCurrencies,
    currentUserId,
  } = useLoaderData<typeof loader>();
  const { setLocations, setCurrencies } = useSettings();
  const regenerateFetcher = useFetcher<
    | {
        success: true;
        intent: "documents-regenerate-previews";
        regenerated: number;
        total: number;
      }
    | {
        success: false;
        intent: "documents-regenerate-previews";
        message: string;
      }
    | undefined
  >();
  const isRegenerating = regenerateFetcher.state !== "idle";
  const regenerateResult = regenerateFetcher.data;

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
            MotoManager-Konto.
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
            <CurrencySettingsForm canEdit={canEditCurrencies} />
          </CardContent>
        </Card>
      </section>

      {canManageUsers && (
        <Card className="border-border/60 bg-white/90 shadow-md backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Dokument-Vorschauen
            </CardTitle>
            <CardDescription>
              Generiere alle PDF-Vorschauen neu, falls Dateien aktualisiert oder
              manuell ersetzt wurden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <regenerateFetcher.Form
              method="post"
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                type="hidden"
                name="intent"
                value="documents-regenerate-previews"
              />
              <Button type="submit" disabled={isRegenerating}>
                {isRegenerating
                  ? "Vorschauen werden neu erstellt..."
                  : "Alle Vorschauen neu generieren"}
              </Button>
              {regenerateResult &&
                regenerateResult.intent === "documents-regenerate-previews" &&
                !regenerateResult.success && (
                  <p className="text-xs text-destructive">
                    {regenerateResult.message}
                  </p>
                )}
            </regenerateFetcher.Form>
            {regenerateResult &&
              regenerateResult.intent === "documents-regenerate-previews" &&
              regenerateResult.success && (
                <p className="text-xs text-muted-foreground">
                  {`${regenerateResult.regenerated} von ${regenerateResult.total} Vorschauen aktualisiert.`}
                </p>
              )}
          </CardContent>
        </Card>
      )}

      {canManageUsers && (
        <UserManagementPanel
          users={loaderUsers}
          currentUserId={currentUserId}
          roles={USER_ROLES}
        />
      )}
    </main>
  );
}
