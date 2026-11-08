import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import {
  createCurrencySetting,
  deleteCurrencySetting,
  getAppUpgradeSettings,
  getCurrencies,
  updateAppUpgradeSettings,
  updateCurrencySetting,
} from "~/services/settings";
import {
  createUser,
  listUsers,
  requireAdmin,
  requireUser,
  startImpersonation,
  updateUser,
  updateUserPassword,
} from "~/services/auth";
import { USER_ROLES, type UserRole } from "~/types/auth";
import type { Route } from "./+types/settings.admin";
import { Button } from "~/components/button";
import { PageHeader } from "~/components/page-header";
import { useConfirm } from "~/components/confirm-provider";
import { useState } from "react";
import { Pencil, Trash2, Plus, Shield, Coins, ArrowLeft, UserPlus, Server, DatabaseBackup, Smartphone, UserCog } from "lucide-react";
import { UserDialog } from "~/components/user-dialog";
import type { PublicUser } from "~/types/auth";
import { fetchFromBackend } from "~/utils/backend";

export function meta() {
  return [
    { title: "Admin-Bereich - Moto Manager" },
    { name: "description", content: "Systemweite Verwaltung von Benutzern und Währungen." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  requireAdmin(user);

  const [users, currencies, appUpgrade] = await Promise.all([
    listUsers(token),
    getCurrencies(),
    getAppUpgradeSettings(token),
  ]);

  return { users, currencies, appUpgrade, user };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user: currentUser, token } = await requireUser(request);
  requireAdmin(currentUser);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // User Management
  if (intent === "createUser") {
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as UserRole;

    if (!email || !username || !name || !password || !USER_ROLES.includes(role)) {
      return { error: "Ungültige Daten." };
    }

    try {
      await createUser({ email, username, name, password, role }, token);
      return { success: "Benutzer erfolgreich erstellt." };
    } catch (e) {
      return { error: (e instanceof Error && e.message) || "Fehler beim Erstellen des Benutzers." };
    }
  }

  if (intent === "updateUser") {
    const userId = Number(formData.get("userId"));
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as UserRole;
    const password = formData.get("password") as string;

    if (!userId || !email || !username || !name || !USER_ROLES.includes(role)) {
      return { error: "Ungültige Daten." };
    }

    // Role change restriction
    if (userId === currentUser.id && role !== currentUser.role) {
      return { error: "Du kannst deine eigene Rolle nicht ändern." };
    }

    try {
      await updateUser(userId, { email, username, name, role }, token);

      if (password && password.length >= 8) {
        await updateUserPassword(userId, password, token);
      }

      return { success: "Benutzer erfolgreich aktualisiert." };
    } catch (e) {
      return { error: (e instanceof Error && e.message) || "Fehler beim Aktualisieren des Benutzers." };
    }
  }

  if (intent === "impersonate") {
    const userId = Number(formData.get("userId"));
    if (!userId || userId === currentUser.id) {
      return { error: "Ungültige ID." };
    }

    try {
      await startImpersonation(userId, token);
    } catch (e) {
      return { error: (e instanceof Error && e.message) || "Impersonation fehlgeschlagen." };
    }
    // Full reload as the impersonated user - drops all admin loader state.
    window.location.assign("/");
    return { success: "Support-Modus gestartet." };
  }

  if (intent === "deleteUser") {
    const userId = Number(formData.get("userId"));

    if (!userId) {
      return { error: "Ungültige ID." };
    }

    if (userId === currentUser.id) {
      return { error: "Du kannst dich nicht selbst löschen." };
    }

    await fetchFromBackend(`/auth/users/${userId}`, { method: "DELETE" }, token);
    return { success: "Benutzer gelöscht." };
  }

  // Currency Management
  if (intent === "createCurrency") {
    const code = formData.get("code") as string;
    const symbol = formData.get("symbol") as string;

    if (!code || !symbol) {
      return { error: "Ungültige Eingaben für Währung." };
    }

    try {
      await createCurrencySetting(token, { code: code.toUpperCase(), symbol, conversionFactor: 1 });
      return { success: `Währung ${code.toUpperCase()} erstellt.` };
    } catch (error) {
      return { error: (error instanceof Error && error.message) || "Fehler beim Erstellen der Währung." };
    }
  }

  if (intent === "updateCurrency") {
    const id = Number(formData.get("id"));
    const code = formData.get("code") as string;
    const symbol = formData.get("symbol") as string;
    const conversionFactor = Number(formData.get("conversionFactor"));

    if (!id || !code || !symbol || isNaN(conversionFactor)) {
      return { error: "Ungültige Eingaben." };
    }

    await updateCurrencySetting(token, id, { code, symbol, conversionFactor });
    return { success: "Währung aktualisiert." };
  }

  if (intent === "deleteCurrency") {
    const id = Number(formData.get("id"));
    await deleteCurrencySetting(token, id);
    return { success: "Währung gelöscht." };
  }

  if (intent === "updateAppUpgrade") {
    const softUpgradeBuild = Number(formData.get("softUpgradeBuild"));
    const hardUpgradeBuild = Number(formData.get("hardUpgradeBuild"));

    if (
      !Number.isInteger(softUpgradeBuild) || softUpgradeBuild < 0 ||
      !Number.isInteger(hardUpgradeBuild) || hardUpgradeBuild < 0
    ) {
      return { error: "Build-Nummern müssen ganze Zahlen ≥ 0 sein." };
    }

    try {
      await updateAppUpgradeSettings(token, { softUpgradeBuild, hardUpgradeBuild });
      return { success: "App-Update-Anforderungen gespeichert." };
    } catch (e) {
      return { error: (e instanceof Error && e.message) || "Fehler beim Speichern der App-Update-Anforderungen." };
    }
  }

  if (intent === "regeneratePreviews") {
    await fetchFromBackend("/admin/regenerate-previews", { method: "POST" }, token);
    return { success: `Vorschauen erfolgreich neu generiert.` };
  }

  return null;
}

function describeUsers(list: PublicUser[]): string {
  if (list.length === 0) return "niemanden";
  return list.map((u) => u.username).join(", ");
}

function relativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

export default function AdminSettings() {
  const { users = [], currencies = [], appUpgrade, user: currentUser } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const confirmDialog = useConfirm();
  const [editingCurrencyId, setEditingCurrencyId] = useState<number | null>(null);
  const [softBuild, setSoftBuild] = useState(String(appUpgrade.softUpgradeBuild));
  const [hardBuild, setHardBuild] = useState(String(appUpgrade.hardUpgradeBuild));
  const latestBuild = users.reduce<number | null>(
    (max, u) => (u.appBuild != null && (max === null || u.appBuild > max) ? u.appBuild : max),
    null,
  );

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // Close the user dialog once a submission settles — adjusted during render
  // on the submitting→idle transition instead of in an effect.
  const [wasSubmitting, setWasSubmitting] = useState(isSubmitting);
  if (wasSubmitting !== isSubmitting) {
    setWasSubmitting(isSubmitting);
    if (!isSubmitting) {
      setIsUserDialogOpen(false);
      setEditingUser(null);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pt-4 sm:pt-10 pb-20">
      <PageHeader
        eyebrow="Konfiguration · Admin"
        title="Admin-Bereich"
        description={`${users.length} Benutzer · Währungen · iOS-App-Updates · Wartung`}
        actions={
          <>
            <Link to="/settings" className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Einstellungen
            </Link>
            <Link to="/settings/backups" className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white">
              <DatabaseBackup className="h-3.5 w-3.5" aria-hidden="true" />
              Backups
            </Link>
            <Link to="/settings/server-stats" className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white">
              <Server className="h-3.5 w-3.5" aria-hidden="true" />
              Server-Statistiken
            </Link>
          </>
        }
      />

      {actionData && "error" in actionData && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {actionData.error}
        </div>
      )}

      {actionData && "success" in actionData && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
          {actionData.success}
        </div>
      )}

      {/* User Management */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              Benutzerverwaltung
            </h2>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              setIsUserDialogOpen(true);
            }}
            variant="secondary"
            size="sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Benutzer hinzufügen
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-secondary dark:bg-navy-900 dark:text-navy-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Benutzername</th>
                <th className="px-4 py-3 font-semibold">E-Mail</th>
                <th className="px-4 py-3 font-semibold">Letzter Login</th>
                <th className="px-4 py-3 font-semibold">App-Version</th>
                <th className="px-4 py-3 font-semibold">Rolle</th>
                <th className="px-4 py-3 font-semibold text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
              {users.map((u) => (
                <tr key={u.id} className="group hover:bg-gray-50 dark:hover:bg-navy-700/50">
                  <td className="px-4 py-3 font-medium text-foreground dark:text-white">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-secondary dark:text-navy-300">
                    {u.email}
                  </td>
                  <td suppressHydrationWarning className="px-4 py-3">
                    {u.lastLoginAt ? (
                      <span className="flex flex-col">
                        <span className="text-sm text-foreground dark:text-white">{relativeDays(u.lastLoginAt)}</span>
                        <span className="font-mono text-[11px] text-base-content/70 dark:text-navy-400">
                          {dateFormatter.format(new Date(u.lastLoginAt))}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-base-content/70">Nie</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-base-content/70 dark:text-navy-400">
                    {u.appVersion ? (
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono">{`${u.appVersion} (${u.appBuild ?? "?"})`}</span>
                        {u.appBuild != null && latestBuild != null && u.appBuild < latestBuild && (
                          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">
                            Veraltet
                          </span>
                        )}
                      </span>
                    ) : (
                      "Keine App"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground dark:text-white capitalize">
                    {u.role}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {u.id !== currentUser.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-secondary hover:text-primary dark:text-navy-400 dark:hover:text-white"
                          onClick={() => {
                            submit(
                              { intent: "impersonate", userId: String(u.id) },
                              { method: "post" },
                            );
                          }}
                          title={`Als ${u.username} anzeigen (Support-Modus)`}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-secondary hover:text-primary dark:text-navy-400 dark:hover:text-white"
                        onClick={() => {
                          setEditingUser(u);
                          setIsUserDialogOpen(true);
                        }}
                        title="Benutzer bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <UserDialog
        isOpen={isUserDialogOpen}
        onClose={() => {
          setIsUserDialogOpen(false);
          setEditingUser(null);
        }}
        initialData={editingUser}
        currentUserId={currentUser.id}
      />

      {/* Currency Management */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Coins className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              Währungen
            </h2>
          </div>
          <div className="text-xs text-secondary dark:text-navy-400">
            * Kurse werden automatisch aktualisiert
          </div>
        </div>

        {/* Add Currency Form */}
        <Form method="post" className="mb-8 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-3 sm:items-end dark:bg-navy-900/50">
          <input type="hidden" name="intent" value="createCurrency" />
          <div className="space-y-1.5">
            <label htmlFor="currency-code" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">Code</label>
            <input
              id="currency-code"
              type="text"
              name="code"
              placeholder="z.B. USD"
              required
              className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="currency-symbol" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">Symbol</label>
            <input
              id="currency-symbol"
              type="text"
              name="symbol"
              placeholder="z.B. $"
              required
              className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
            />
          </div>
          {/* Conversion factor is now fetched automatically */}
          <Button type="submit" variant="secondary" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Hinzufügen
          </Button>
        </Form>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currencies.map((currency) => (
            <div
              key={currency.id}
              className="group relative rounded-xl border border-gray-200 bg-gray-50 p-4 transition-all hover:border-primary/50 hover:shadow-md dark:border-navy-700 dark:bg-navy-900 dark:hover:border-primary/50"
            >
              {editingCurrencyId === currency.id ? (
                <Form
                  method="post"
                  className="space-y-3"
                  onSubmit={() => setEditingCurrencyId(null)}
                >
                  <input type="hidden" name="intent" value="updateCurrency" />
                  <input type="hidden" name="id" value={currency.id} />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="code"
                      defaultValue={currency.code}
                      required
                      className="rounded-lg border-gray-200 bg-white px-2 py-1 text-sm dark:border-navy-600 dark:bg-navy-800"
                    />
                    <input
                      type="text"
                      name="symbol"
                      defaultValue={currency.symbol}
                      required
                      className="rounded-lg border-gray-200 bg-white px-2 py-1 text-sm dark:border-navy-600 dark:bg-navy-800"
                    />
                  </div>
                  <input
                    type="number"
                    name="conversionFactor"
                    step="0.0001"
                    defaultValue={currency.conversionFactor}
                    required
                    className="w-full rounded-lg border-gray-200 bg-white px-2 py-1 text-sm dark:border-navy-600 dark:bg-navy-800"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCurrencyId(null)}
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" size="sm">
                      Speichern
                    </Button>
                  </div>
                </Form>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground dark:text-white">{currency.code}</span>
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-navy-800 dark:text-navy-200">{currency.symbol}</span>
                      </div>
                      <p className="mt-1 text-sm text-secondary dark:text-navy-400">
                        Faktor: <span className="font-mono">{currency.conversionFactor.toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCurrencyId(currency.id)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Währung ${currency.code} löschen`}
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: "Währung löschen?",
                            description: `Währung "${currency.code}" wirklich löschen?`,
                          });
                          if (!ok) return;
                          submit(
                            { intent: "deleteCurrency", id: String(currency.id) },
                            { method: "post" },
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* App Upgrade Requirements */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
            iOS-App-Updates
          </h2>
        </div>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="updateAppUpgrade" />
          <p className="text-sm text-secondary dark:text-navy-300">
            Apps mit Build-Nummer <strong>bis einschliesslich</strong> der Soft-Grenze zeigen nach dem
            Login eine Update-Erinnerung. Apps <strong>unterhalb</strong> der Hard-Grenze sind nicht mehr
            unterstützt und stellen keine Anfragen mehr an den Server. 0 deaktiviert die jeweilige Prüfung.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="soft-upgrade-build" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
                Soft-Update-Build (Erinnerung)
              </label>
              <input
                id="soft-upgrade-build"
                type="number"
                name="softUpgradeBuild"
                min="0"
                step="1"
                value={softBuild}
                onChange={(event) => setSoftBuild(event.target.value)}
                required
                className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="hard-upgrade-build" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
                Hard-Update-Build (Sperre)
              </label>
              <input
                id="hard-upgrade-build"
                type="number"
                name="hardUpgradeBuild"
                min="0"
                step="1"
                value={hardBuild}
                onChange={(event) => setHardBuild(event.target.value)}
                required
                className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
              />
            </div>
          </div>
          <p className="rounded-sm border border-base-300 bg-base-200/50 px-3 py-2 text-sm text-base-content dark:border-navy-700 dark:bg-navy-900">
            <strong>Vorschau:</strong>{" "}
            {Number(softBuild) > 0
              ? `Erinnerung trifft ${describeUsers(users.filter((u) => u.appBuild != null && u.appBuild <= Number(softBuild)))}`
              : "Keine Erinnerung"}
            {" · "}
            {Number(hardBuild) > 0
              ? `Sperre trifft ${describeUsers(users.filter((u) => u.appBuild != null && u.appBuild < Number(hardBuild)))}`
              : "keine Sperre"}
            {latestBuild != null && ` · neuester Build im Einsatz: ${latestBuild}`}
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              Speichern
            </Button>
          </div>
        </Form>
      </section>

      {/* System Maintenance */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
            Systemwartung
          </h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-secondary dark:text-navy-300">
            Fehlende oder defekte Vorschaubilder für PDF-Dokumente können hier neu generiert werden.
            Dies kann einige Zeit in Anspruch nehmen.
          </p>
          <Form method="post">
            <input type="hidden" name="intent" value="regeneratePreviews" />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Arbeite..." : "Alle Vorschauen neu generieren"}
            </Button>
          </Form>
        </div>
      </section>
    </div>
  );
}
export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
