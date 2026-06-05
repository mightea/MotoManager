import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import {
  createLocation,
  deleteLocation,
  getLocations,
  getUserSettings,
  updateLocation,
  updateUserSettings,
} from "~/services/settings";
import {
  requireUser,
} from "~/services/auth";
import { fetchFromBackend } from "~/utils/backend";
import type { Route } from "./+types/settings";
import { Button } from "~/components/button";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { LocationEditDialog } from "~/components/location-edit-dialog";
import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Plus,
  Fingerprint,
  Key,
  Activity,
  Lock,
  MapPin,
  Warehouse,
  Wrench,
  Fuel,
  ClipboardCheck,
  CheckSquare,
} from "lucide-react";
import { registerPasskey } from "~/utils/webauthn";
import type { Location, LocationType } from "~/types/db";

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
    fetchFromBackend<any>("/settings/authenticators", {}, token).catch(() => []),
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
    const forkOilKmInterval = parseKm(formData.get("forkOilKmInterval"));
    const brakeFluidKmInterval = parseKm(formData.get("brakeFluidKmInterval"));
    const coolantKmInterval = parseKm(formData.get("coolantKmInterval"));
    const chainKmInterval = parseKm(formData.get("chainKmInterval"));

    await updateUserSettings(token, user.id, {
      tireInterval,
      batteryLithiumInterval,
      batteryDefaultInterval,
      engineOilInterval,
      gearboxOilInterval,
      finalDriveOilInterval,
      forkOilInterval,
      brakeFluidInterval,
      coolantInterval,
      chainInterval,
      tireKmInterval,
      engineOilKmInterval,
      gearboxOilKmInterval,
      finalDriveOilKmInterval,
      forkOilKmInterval,
      brakeFluidKmInterval,
      coolantKmInterval,
      chainKmInterval,
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
      await fetchFromBackend("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }, token);
      return { success: "Passwort erfolgreich geändert." };
    } catch (err: any) {
      return { error: err.message || "Passwortänderung fehlgeschlagen." };
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
    await createLocation(token, { name, type, userId: user.id, latitude, longitude });
    return { success: "Standort erstellt." };
  }

  if (intent === "updateLocation") {
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    if (!id || !name) return { error: "Ungültige Daten." };
    const type = parseLocationType(formData.get("type"), "fuelStation");
    const latitude = parseCoord(formData.get("latitude"));
    const longitude = parseCoord(formData.get("longitude"));
    await updateLocation(token, id, user.id, {
      name,
      type,
      latitude,
      longitude,
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

  return null;
}

type LocationSection = {
  type: LocationType;
  label: string;
  description: string;
  placeholder: string;
  icon: typeof MapPin;
  iconBg: string;
  iconFg: string;
};

const LOCATION_SECTIONS: LocationSection[] = [
  {
    type: "storage",
    label: "Garagen & Lager",
    description: "Wo deine Fahrzeuge untergebracht sind.",
    placeholder: "Neuer Lagerort (z.B. Garage)",
    icon: Warehouse,
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconFg: "text-rose-600 dark:text-rose-400",
  },
  {
    type: "maintenanceShop",
    label: "Werkstätten",
    description: "Betriebe, bei denen du Wartung durchführen lässt.",
    placeholder: "Neue Werkstatt (z.B. Werkstatt Müller)",
    icon: Wrench,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconFg: "text-amber-600 dark:text-amber-400",
  },
  {
    type: "fuelStation",
    label: "Tankstellen",
    description: "Tankstellen, die du regelmässig anfährst.",
    placeholder: "Neue Tankstelle (z.B. Shell Zürich)",
    icon: Fuel,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconFg: "text-emerald-600 dark:text-emerald-400",
  },
  {
    type: "inspection",
    label: "Prüfstellen",
    description: "MFK- und Inspektionsstellen.",
    placeholder: "Neue Prüfstelle (z.B. STVA Zürich)",
    icon: ClipboardCheck,
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconFg: "text-sky-600 dark:text-sky-400",
  },
  {
    type: "other",
    label: "Sonstige",
    description: "Alles, was sonst nicht passt.",
    placeholder: "Neuer Standort",
    icon: MapPin,
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconFg: "text-slate-600 dark:text-slate-300",
  },
];

export default function Settings() {
  const { locations, userAuthenticators, settings } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  type DialogState =
    | { mode: "edit"; location: Location }
    | { mode: "create"; type: LocationType }
    | null;
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [selectionSection, setSelectionSection] = useState<LocationType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkType, setBulkType] = useState<LocationType>("fuelStation");
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting";

  const groupedLocations = useMemo(() => {
    const groups: Record<LocationType, Location[]> = {
      storage: [],
      maintenanceShop: [],
      fuelStation: [],
      inspection: [],
      other: [],
    };
    for (const loc of locations as Location[]) {
      (groups[loc.type] ?? groups.other).push(loc);
    }
    return groups;
  }, [locations]);

  const exitSelectionMode = () => {
    setSelectionSection(null);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (type: LocationType) => {
    setSelectionSection(type);
    setSelectedIds(new Set());
    // Default bulk-target to a different type so the action isn't a no-op.
    setBulkType(type === "fuelStation" ? "maintenanceShop" : "fuelStation");
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Exit selection mode and close the create/edit dialog on a successful action.
  useEffect(() => {
    if (actionData && "success" in actionData) {
      setDialogState(null);
      exitSelectionMode();
    }
    // exitSelectionMode is stable enough for this case; intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pt-4 sm:pt-10 pb-20">
      <div className="space-y-3">
        <span className="label-tag">
          <span>Konfiguration</span>
        </span>
        <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-base-content dark:text-white">
          Einstellungen
        </h1>
        <p className="text-base-content/65 dark:text-navy-300">
          Konto, Service-Intervalle, Lagerorte.
        </p>
      </div>

      {actionData && "error" in actionData && (
        <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] pt-0.5 opacity-70">ERR</span>
          <span>{actionData.error}</span>
        </div>
      )}

      {actionData && "success" in actionData && (
        <div className="relative flex items-start gap-3 rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success dark:border-success/40 dark:bg-success/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-success" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] pt-0.5 opacity-70">OK</span>
          <span>{(actionData as any).success}</span>
        </div>
      )}

      {/* Password Change Section */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              Passwort ändern
            </h2>
            <p className="text-sm text-secondary dark:text-navy-300">
              Aktualisiere dein Passwort für mehr Sicherheit.
            </p>
          </div>
        </div>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="changePassword" />
          <div className="space-y-1.5">
            <label
              htmlFor="currentPassword"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
            >
              Aktuelles Passwort
            </label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              required
              className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
              >
                Neues Passwort
              </label>
              <input
                type="password"
                name="newPassword"
                id="newPassword"
                required
                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
              >
                Passwort bestätigen
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                required
                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              Passwort speichern
            </Button>
          </div>
        </Form>
      </section>

      {/* Passkeys Section */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">Passkeys</h2>
              <p className="text-sm text-secondary dark:text-navy-300">
                Logge dich schneller und sicherer mit Biometrie ein.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                await registerPasskey();
                window.location.reload();
              } catch (err) {
                alert("Fehler beim Erstellen des Passkeys: " + (err instanceof Error ? err.message : "Unbekannt"));
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Hinzufügen
          </Button>
        </div>

        <div className="space-y-3">
          {userAuthenticators.map((auth) => (
            <div
              key={auth.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-navy-700 dark:bg-navy-900"
            >
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-secondary dark:text-navy-400" />
                <div>
                  <p className="text-sm font-medium text-foreground dark:text-white">
                    {auth.deviceType === "single_device" ? "Sicherheitsschlüssel / Gerät" : "Multi-Device Passkey"}
                  </p>
                  <p className="text-[10px] text-secondary/60 dark:text-navy-500 uppercase tracking-wider font-bold">
                    ID: {auth.id?.slice(0, 8) ?? "N/A"}... • Registriert am {auth.createdAt ? new Date(auth.createdAt).toLocaleDateString("de-CH") : "Unbekannt"}
                  </p>
                </div>
              </div>
              <Form method="post" onSubmit={(e) => !confirm("Passkey wirklich löschen?") && e.preventDefault()}>
                <input type="hidden" name="intent" value="deleteAuthenticator" />
                <input type="hidden" name="id" value={auth.id} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Form>
            </div>
          ))}
          {userAuthenticators.length === 0 && (
            <p className="py-4 text-center text-sm text-secondary dark:text-navy-400">
              Keine Passkeys registriert.
            </p>
          )}
        </div>
      </section>

      {/* Locations Section */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="flex items-start gap-3 mb-6">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              Standorte verwalten
            </h2>
            <p className="text-sm text-secondary dark:text-navy-300">
              Garagen, Werkstätten, Tankstellen und Prüfstellen — gruppiert nach Typ.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {LOCATION_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const items = groupedLocations[section.type];
            const isSelecting = selectionSection === section.type;
            const allSelectedInSection = items.length > 0 && selectedIds.size === items.length;
            return (
              <div key={section.type} className="space-y-3">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-2 dark:border-navy-700">
                  <div className={`rounded-md ${section.iconBg} p-1.5 ${section.iconFg}`}>
                    <SectionIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-sm uppercase tracking-wider text-base-content dark:text-white">
                      {section.label}
                    </h3>
                    <p className="text-xs text-secondary dark:text-navy-400">
                      {section.description}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums text-base-content/50">
                    {items.length}
                  </span>
                  {!isSelecting && items.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => enterSelectionMode(section.type)}
                      title="Mehrfachauswahl"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  )}
                  {!isSelecting && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setDialogState({ mode: "create", type: section.type })}
                      title={`${section.label}: Eintrag hinzufügen`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {isSelecting && (
                  <Form
                    method="post"
                    className="flex flex-wrap items-center gap-3 rounded-sm border border-primary/40 bg-primary/5 p-3"
                    onSubmit={(e) => {
                      if (selectedIds.size === 0) {
                        e.preventDefault();
                        return;
                      }
                    }}
                  >
                    <input type="hidden" name="intent" value="bulkUpdateLocationType" />
                    <input type="hidden" name="type" value={bulkType} />
                    {[...selectedIds].map((id) => (
                      <input key={id} type="hidden" name="ids" value={id} />
                    ))}
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] tabular-nums text-base-content">
                      {selectedIds.size} / {items.length} ausgewählt
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedIds(
                          allSelectedInSection ? new Set() : new Set(items.map((l) => l.id)),
                        )
                      }
                      disabled={items.length === 0}
                    >
                      {allSelectedInSection ? "Auswahl aufheben" : "Alle auswählen"}
                    </Button>
                    <span className="text-sm text-secondary dark:text-navy-300">→ neuer Typ:</span>
                    <select
                      value={bulkType}
                      onChange={(e) => setBulkType(e.target.value as LocationType)}
                      className="rounded-sm border border-base-300 bg-base-100 p-2 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                    >
                      {LOCATION_SECTIONS.filter((s) => s.type !== section.type).map((s) => (
                        <option key={s.type} value={s.type}>{s.label}</option>
                      ))}
                    </select>
                    <div className="ml-auto flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={exitSelectionMode}>
                        Abbrechen
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={selectedIds.size === 0 || isSubmitting}
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Löschen
                      </Button>
                      <Button type="submit" size="sm" disabled={selectedIds.size === 0 || isSubmitting}>
                        Typ zuweisen
                      </Button>
                    </div>
                  </Form>
                )}

                {items.length === 0 ? (
                  <p className="py-3 text-center text-xs text-secondary/70 dark:text-navy-500">
                    Noch keine Einträge.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((location) => {
                      const isSelected = selectedIds.has(location.id);
                      const cardClass = `flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors text-left w-full ${
                        isSelected
                          ? "border-primary/60 bg-primary/5"
                          : "border-gray-100 bg-gray-50 hover:border-gray-200 dark:border-navy-700 dark:bg-navy-900 dark:hover:border-navy-600"
                      }`;
                      const body = (
                        <>
                          {isSelecting && (
                            <span
                              aria-hidden="true"
                              className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                                isSelected ? "border-primary bg-primary" : "border-gray-400 bg-base-100"
                              }`}
                            >
                              {isSelected && (
                                <span className="block h-2 w-2 rounded-[1px] bg-white" />
                              )}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground dark:text-white">
                              {location.name}
                            </p>
                            {location.latitude !== null && location.longitude !== null && (
                              <p className="font-mono text-[10px] tabular-nums text-secondary/70 dark:text-navy-500">
                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                              </p>
                            )}
                          </div>
                        </>
                      );
                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={
                            isSelecting
                              ? () => toggleSelected(location.id)
                              : () => setDialogState({ mode: "edit", location })
                          }
                          aria-pressed={isSelecting ? isSelected : undefined}
                          aria-label={
                            isSelecting
                              ? `${location.name} auswählen`
                              : `${location.name} bearbeiten`
                          }
                          className={cardClass}
                        >
                          {body}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <LocationEditDialog
        isOpen={dialogState !== null}
        onClose={() => setDialogState(null)}
        location={dialogState?.mode === "edit" ? dialogState.location : null}
        defaultType={dialogState?.mode === "create" ? dialogState.type : undefined}
      />

      <DeleteConfirmationDialog
        isOpen={bulkDeleteConfirmOpen}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (selectedIds.size === 0) {
            setBulkDeleteConfirmOpen(false);
            return;
          }
          const fd = new FormData();
          fd.set("intent", "deleteLocationsBulk");
          for (const id of selectedIds) {
            fd.append("ids", String(id));
          }
          submit(fd, { method: "post" });
          setBulkDeleteConfirmOpen(false);
        }}
        title={`${selectedIds.size} ${selectedIds.size === 1 ? "Standort" : "Standorte"} löschen`}
        description="Möchtest du die ausgewählten Standorte wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        confirmDisabled={selectedIds.size === 0}
      />

      {/* Maintenance Intervals Section */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">Service-Intervalle</h2>
            <p className="text-sm text-secondary dark:text-navy-300">
              Konfiguriere die Zeitabstände (in Jahren) für deine Service-Erinnerungen.
            </p>
          </div>
        </div>

        <Form method="post" className="space-y-6">
          <input type="hidden" name="intent" value="updateUserSettings" />
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400 border-b border-gray-100 dark:border-navy-700 pb-2">Allgemein</h3>
              
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="tireInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Reifen (Jahre)</label>
                  <input
                    type="number"
                    name="tireInterval"
                    id="tireInterval"
                    defaultValue={settings?.tireInterval}
                    min="1"
                    max="20"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="tireKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Reifen (km)</label>
                  <input
                    type="number"
                    name="tireKmInterval"
                    id="tireKmInterval"
                    defaultValue={settings?.tireKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="batteryDefaultInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Batterie Standard (Jahre)</label>
                <input
                  type="number"
                  name="batteryDefaultInterval"
                  id="batteryDefaultInterval"
                  defaultValue={settings?.batteryDefaultInterval}
                  min="1"
                  max="20"
                  required
                  className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="batteryLithiumInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Batterie Lithium (Jahre)</label>
                <input
                  type="number"
                  name="batteryLithiumInterval"
                  id="batteryLithiumInterval"
                  defaultValue={settings?.batteryLithiumInterval}
                  min="1"
                  max="20"
                  required
                  className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400 border-b border-gray-100 dark:border-navy-700 pb-2">Öle & Flüssigkeiten</h3>
              
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="engineOilInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Motoröl (Jahre)</label>
                  <input
                    type="number"
                    name="engineOilInterval"
                    id="engineOilInterval"
                    defaultValue={settings?.engineOilInterval}
                    min="1"
                    max="10"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="engineOilKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Motoröl (km)</label>
                  <input
                    type="number"
                    name="engineOilKmInterval"
                    id="engineOilKmInterval"
                    defaultValue={settings?.engineOilKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="gearboxOilInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Getriebeöl (Jahre)</label>
                  <input
                    type="number"
                    name="gearboxOilInterval"
                    id="gearboxOilInterval"
                    defaultValue={settings?.gearboxOilInterval}
                    min="1"
                    max="10"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="gearboxOilKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Getriebeöl (km)</label>
                  <input
                    type="number"
                    name="gearboxOilKmInterval"
                    id="gearboxOilKmInterval"
                    defaultValue={settings?.gearboxOilKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="finalDriveOilInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Kardanöl (Jahre)</label>
                  <input
                    type="number"
                    name="finalDriveOilInterval"
                    id="finalDriveOilInterval"
                    defaultValue={settings?.finalDriveOilInterval}
                    min="1"
                    max="10"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="finalDriveOilKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Kardanöl (km)</label>
                  <input
                    type="number"
                    name="finalDriveOilKmInterval"
                    id="finalDriveOilKmInterval"
                    defaultValue={settings?.finalDriveOilKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="forkOilInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Gabelöl (Jahre)</label>
                  <input
                    type="number"
                    name="forkOilInterval"
                    id="forkOilInterval"
                    defaultValue={settings?.forkOilInterval}
                    min="1"
                    max="10"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="forkOilKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Gabelöl (km)</label>
                  <input
                    type="number"
                    name="forkOilKmInterval"
                    id="forkOilKmInterval"
                    defaultValue={settings?.forkOilKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="brakeFluidInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Bremsflüssigkeit (Jahre)</label>
                  <input
                    type="number"
                    name="brakeFluidInterval"
                    id="brakeFluidInterval"
                    defaultValue={settings?.brakeFluidInterval}
                    min="1"
                    max="10"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="brakeFluidKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Bremsflüssigkeit (km)</label>
                  <input
                    type="number"
                    name="brakeFluidKmInterval"
                    id="brakeFluidKmInterval"
                    defaultValue={settings?.brakeFluidKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="coolantInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Kühlflüssigkeit (Jahre)</label>
                  <input
                    type="number"
                    name="coolantInterval"
                    id="coolantInterval"
                    defaultValue={settings?.coolantInterval}
                    min="1"
                    max="10"
                    required
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="coolantKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Kühlflüssigkeit (km)</label>
                  <input
                    type="number"
                    name="coolantKmInterval"
                    id="coolantKmInterval"
                    defaultValue={settings?.coolantKmInterval ?? ""}
                    min="1000"
                    step="1000"
                    placeholder="Optional"
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400 border-b border-gray-100 dark:border-navy-700 pb-2">Weitere Wartungen</h3>
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="chainInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Kette (Jahre)</label>
                    <input
                      type="number"
                      name="chainInterval"
                      id="chainInterval"
                      defaultValue={settings?.chainInterval}
                      min="1"
                      max="10"
                      required
                      className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="chainKmInterval" className="text-xs font-semibold text-secondary dark:text-navy-300">Kette (km)</label>
                    <input
                      type="number"
                      name="chainKmInterval"
                      id="chainKmInterval"
                      defaultValue={settings?.chainKmInterval ?? ""}
                      min="500"
                      step="500"
                      placeholder="Optional"
                      className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              Intervalle speichern
            </Button>
          </div>
        </Form>
      </section>

      {/* Version Info */}
      <div className="pt-4 text-center">
        <p className="text-xs text-secondary/50 dark:text-navy-500">
          MotoManager v{process.env.APP_VERSION}
        </p>
      </div>
    </div>
  );
}
