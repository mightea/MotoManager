import { Link, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  createLocation,
  deleteLocation,
  getLocations,
  mergeLocations,
  getUserSettings,
  updateLocation,
  updateUserSettings,
} from "~/services/settings";
import { resolveCountryCode } from "~/services/map";
import { requireUser } from "~/services/auth";
import { fetchFromBackend } from "~/utils/backend";
import type { Route } from "./+types/settings";
import { PageHeader } from "~/components/page-header";
import { Card } from "~/components/card";
import { AppConnectCard } from "~/components/app-connect-card";
import { AccountSecuritySection } from "~/components/settings/account-security-section";
import { IntervalsSection } from "~/components/settings/intervals-section";
import { LocationsSection } from "~/components/settings/locations-section";
import { SettingsNav, type SettingsNavItem } from "~/components/settings/settings-nav";
import type { Authenticator, Location, LocationType } from "~/types/db";

export function meta() {
  return [
    { title: "Einstellungen - Moto Manager" },
    { name: "description", content: "Verwalte deine Kontoeinstellungen und Lagerorte." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  const [locations, settings, userAuthenticatorsRaw] = await Promise.all([
    getLocations(token, user.id),
    getUserSettings(token, user.id),
    fetchFromBackend<Authenticator[]>("/settings/authenticators", {}, token).catch(() => []),
  ]);
  
  const userAuthenticators = Array.isArray(userAuthenticatorsRaw) ? userAuthenticatorsRaw : [];
  
  return { locations, user, settings, userAuthenticators };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user, token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "updateUserSettings") {
    const tireInterval = Number(formData.get("tireInterval"));
    const batteryLithiumInterval = Number(formData.get("batteryLithiumInterval"));
    const batteryDefaultInterval = Number(formData.get("batteryDefaultInterval"));
    const engineOilInterval = Number(formData.get("engineOilInterval"));
    const gearboxOilInterval = Number(formData.get("gearboxOilInterval"));
    const finalDriveOilInterval = Number(formData.get("finalDriveOilInterval"));
    const finalDriveGearboxOilInterval = Number(formData.get("finalDriveGearboxOilInterval"));
    const forkOilInterval = Number(formData.get("forkOilInterval"));
    const brakeFluidInterval = Number(formData.get("brakeFluidInterval"));
    const coolantInterval = Number(formData.get("coolantInterval"));
    const chainInterval = Number(formData.get("chainInterval"));

    const parseKm = (val: FormDataEntryValue | null) => {
      const num = Number(val);
      return isNaN(num) || num <= 0 ? null : num;
    };

    const tireKmInterval = parseKm(formData.get("tireKmInterval"));
    const engineOilKmInterval = parseKm(formData.get("engineOilKmInterval"));
    const gearboxOilKmInterval = parseKm(formData.get("gearboxOilKmInterval"));
    const finalDriveOilKmInterval = parseKm(formData.get("finalDriveOilKmInterval"));
    const finalDriveGearboxOilKmInterval = parseKm(formData.get("finalDriveGearboxOilKmInterval"));
    const forkOilKmInterval = parseKm(formData.get("forkOilKmInterval"));
    const brakeFluidKmInterval = parseKm(formData.get("brakeFluidKmInterval"));
    const coolantKmInterval = parseKm(formData.get("coolantKmInterval"));
    const chainKmInterval = parseKm(formData.get("chainKmInterval"));
    // 0 (or blank) disables the yearly-distance warning on the overview cards.
    const minKmPerYear = parseKm(formData.get("minKmPerYear")) ?? 0;

    await updateUserSettings(token, user.id, {
      tireInterval,
      batteryLithiumInterval,
      batteryDefaultInterval,
      engineOilInterval,
      gearboxOilInterval,
      finalDriveOilInterval,
      finalDriveGearboxOilInterval,
      forkOilInterval,
      brakeFluidInterval,
      coolantInterval,
      chainInterval,
      tireKmInterval,
      engineOilKmInterval,
      gearboxOilKmInterval,
      finalDriveOilKmInterval,
      finalDriveGearboxOilKmInterval,
      forkOilKmInterval,
      brakeFluidKmInterval,
      coolantKmInterval,
      chainKmInterval,
      minKmPerYear,
    });
    return { success: "Service-Intervalle aktualisiert." };
  }

  if (intent === "deleteAuthenticator") {
    const id = formData.get("id") as string;
    if (!id) return { error: "ID fehlt." };
    await fetchFromBackend(`/settings/authenticators/${id}`, { method: "DELETE" }, token);
    return { success: "Passkey gelöscht." };
  }

  if (intent === "changePassword") {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: "Alle Felder müssen ausgefüllt werden." };
    }

    if (newPassword !== confirmPassword) {
      return { error: "Die neuen Passwörter stimmen nicht überein." };
    }

    try {
      await fetchFromBackend("/settings/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      }, token);
      return { success: "Passwort erfolgreich geändert." };
    } catch (err) {
      return { error: (err instanceof Error && err.message) || "Passwortänderung fehlgeschlagen." };
    }
  }

  const VALID_LOCATION_TYPES: LocationType[] = [
    "storage",
    "maintenanceShop",
    "fuelStation",
    "inspection",
    "other",
  ];
  const parseLocationType = (raw: FormDataEntryValue | null, fallback: LocationType): LocationType => {
    return VALID_LOCATION_TYPES.includes(raw as LocationType) ? (raw as LocationType) : fallback;
  };
  const parseCoord = (raw: FormDataEntryValue | null): number | null => {
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  if (intent === "createLocation") {
    const name = formData.get("name") as string;
    const type = parseLocationType(formData.get("type"), "fuelStation");
    if (!name) return { error: "Name ist erforderlich." };
    const latitude = parseCoord(formData.get("latitude"));
    const longitude = parseCoord(formData.get("longitude"));
    const countryCode = await resolveCountryCode(latitude, longitude);
    await createLocation(token, { name, type, userId: user.id, latitude, longitude, countryCode });
    return { success: "Standort erstellt." };
  }

  if (intent === "updateLocation") {
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    if (!id || !name) return { error: "Ungültige Daten." };
    const type = parseLocationType(formData.get("type"), "fuelStation");
    const latitude = parseCoord(formData.get("latitude"));
    const longitude = parseCoord(formData.get("longitude"));
    const countryCode = await resolveCountryCode(latitude, longitude);
    await updateLocation(token, id, user.id, {
      name,
      type,
      latitude,
      longitude,
      countryCode,
    });
    return { success: "Standort aktualisiert." };
  }

  if (intent === "bulkUpdateLocationType") {
    const ids = formData
      .getAll("ids")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
    const type = parseLocationType(formData.get("type"), "fuelStation");
    if (ids.length === 0) return { error: "Keine Auswahl." };
    await Promise.all(ids.map((id) => updateLocation(token, id, user.id, { type })));
    return { success: `${ids.length} Standort${ids.length === 1 ? "" : "e"} aktualisiert.` };
  }

  if (intent === "deleteLocation") {
    const id = Number(formData.get("id"));
    if (!id) return { error: "Ungültige ID." };
    await deleteLocation(token, id, user.id);
    return { success: "Standort gelöscht." };
  }

  if (intent === "deleteLocationsBulk") {
    const ids = formData
      .getAll("ids")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return { error: "Keine Auswahl." };
    // Sequential, not parallel: each delete now opens a write transaction on
    // the backend (to detach references), and SQLite has a single writer.
    // Firing N in parallel makes most of them lose the lock with SQLITE_BUSY.
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await deleteLocation(token, id, user.id);
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    if (succeeded === 0) {
      return { error: `Keiner der ${failed} Standorte konnte gelöscht werden.` };
    }
    if (failed > 0) {
      return {
        success: `${succeeded} Standort${succeeded === 1 ? "" : "e"} gelöscht, ${failed} fehlgeschlagen.`,
      };
    }
    return { success: `${succeeded} Standort${succeeded === 1 ? "" : "e"} gelöscht.` };
  }

  if (intent === "mergeDuplicateLocations") {
    const groupsRaw = formData.get("groups");
    if (typeof groupsRaw !== "string") return { error: "Keine Auswahl." };
    let groups: { canonicalId: number; duplicateIds: number[] }[];
    try {
      groups = JSON.parse(groupsRaw);
    } catch {
      return { error: "Ungültige Daten." };
    }
    const valid = groups.filter(
      (g) =>
        Number.isFinite(g.canonicalId) &&
        Array.isArray(g.duplicateIds) &&
        g.duplicateIds.some((id) => Number.isFinite(id)),
    );
    if (valid.length === 0) return { error: "Keine Duplikate gefunden." };
    // Sequential, not parallel: each merge opens a write transaction on the
    // backend, and SQLite has a single writer — parallel calls would lose the
    // lock with SQLITE_BUSY.
    let mergedCount = 0;
    let failedGroups = 0;
    for (const g of valid) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await mergeLocations(token, g.canonicalId, g.duplicateIds);
        mergedCount += res?.merged ?? g.duplicateIds.length;
      } catch {
        failedGroups += 1;
      }
    }
    if (mergedCount === 0) {
      return { error: "Zusammenführen fehlgeschlagen." };
    }
    const suffix = failedGroups > 0 ? ` (${failedGroups} Gruppe(n) fehlgeschlagen)` : "";
    return {
      success: `${mergedCount} Duplikat${mergedCount === 1 ? "" : "e"} zusammengeführt${suffix}.`,
    };
  }

  return null;
}

const SECTIONS: SettingsNavItem[] = [
  { id: "app", label: "iPhone-App" },
  { id: "konto", label: "Konto & Sicherheit" },
  { id: "ki", label: "KI-Zugriff (MCP)" },
  { id: "standorte", label: "Standorte" },
  { id: "intervalle", label: "Service-Intervalle" },
  { id: "ueber", label: "Über" },
];

export default function Settings() {
  const { locations, user, userAuthenticators, settings } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="container mx-auto max-w-7xl space-y-7 px-4 pt-4 pb-20 md:p-6 md:pb-16">
      <PageHeader
        eyebrow="Konfiguration"
        title="Einstellungen"
        description="Konto, iPhone-App, Standorte und Service-Intervalle."
      />

      {actionData && "error" in actionData && (
        <div
          role="alert"
          className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10"
        >
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] pt-0.5 opacity-70">ERR</span>
          <span>{actionData.error}</span>
        </div>
      )}

      {actionData && "success" in actionData && (
        <output className="relative flex items-start gap-3 rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success dark:border-success/40 dark:bg-success/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-success" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] pt-0.5 opacity-70">OK</span>
          <span>{actionData.success}</span>
        </output>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsNav items={SECTIONS} />

        <div className="flex min-w-0 flex-col gap-4">
          <AppConnectCard username={user.username} />

          <AccountSecuritySection authenticators={userAuthenticators} isSubmitting={isSubmitting} />

          <section id="ki" aria-labelledby="ki-h" className="scroll-mt-24">
            <Card className="transition-colors hover:border-base-content/30 dark:hover:border-navy-500">
              <Link
                to="/settings/api-tokens"
                className="flex items-center gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2
                    id="ki-h"
                    className="font-subdisplay text-[15px] leading-tight tracking-[0.06em] text-base-content dark:text-white"
                  >
                    KI-Zugriff (MCP)
                  </h2>
                  <span className="text-sm text-base-content/70 dark:text-navy-300">
                    API-Tokens für KI-Assistenten wie Claude verwalten und Zugriffe einsehen.
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary dark:text-primary-light">
                  Tokens →
                </span>
              </Link>
            </Card>
          </section>

          <LocationsSection
            locations={locations as Location[]}
            isSubmitting={isSubmitting}
            lastActionSucceeded={actionData && "success" in actionData ? actionData : null}
          />

          <IntervalsSection settings={settings} isSubmitting={isSubmitting} />

          <section
            id="ueber"
            aria-label="Über"
            className="scroll-mt-24 px-1 py-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400"
          >
            MotoManager v{process.env.APP_VERSION}
          </section>
        </div>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
