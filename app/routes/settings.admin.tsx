import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import {
  createCurrencySetting,
  deleteCurrencySetting,
  getCurrencies,
  updateCurrencySetting,
  updateCurrencyByCode,
} from "~/db/providers/settings.server";
import { getDb } from "~/db";
import {
  deleteUser,
  listUsers,
  requireAdmin,
  requireUser,
  updateUserRole,
} from "~/services/auth.server";
import { USER_ROLES } from "~/types/auth";
import type { Route } from "./+types/settings.admin";
import { Button } from "~/components/button";
import { useState } from "react";
import { Pencil, Trash2, Plus, Shield, Coins } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  requireAdmin(user);

  const db = await getDb();
  const [users, currencies] = await Promise.all([
    listUsers(),
    getCurrencies(db),
  ]);

  return { users, currencies, user };
}

export async function action({ request }: Route.ActionArgs) {
  const { user: currentUser } = await requireUser(request);
  requireAdmin(currentUser);

  const db = await getDb();
  const formData = await request.formData();
  const intent = formData.get("intent");

  // User Management
  if (intent === "updateUserRole") {
    const userId = Number(formData.get("userId"));
    const role = formData.get("role") as any;

    if (!userId || !USER_ROLES.includes(role)) {
      return { error: "Ungültige Daten." };
    }

    if (userId === currentUser.id) {
      return { error: "Du kannst deine eigene Rolle nicht ändern." };
    }

    await updateUserRole(userId, role);
    return { success: "Benutzerrolle aktualisiert." };
  }

  if (intent === "deleteUser") {
    const userId = Number(formData.get("userId"));

    if (!userId) {
      return { error: "Ungültige ID." };
    }

    if (userId === currentUser.id) {
      return { error: "Du kannst dich nicht selbst löschen." };
    }

    await deleteUser(userId);
    return { success: "Benutzer gelöscht." };
  }

  // Currency Management
  if (intent === "createCurrency") {
    const code = formData.get("code") as string;
    const symbol = formData.get("symbol") as string;

    if (!code || !symbol) {
      return { error: "Ungültige Eingaben für Währung." };
    }

    const upperCode = code.toUpperCase();

    // Fetch rates from API
    try {
      const response = await fetch("https://api.frankfurter.app/latest?from=CHF");
      if (!response.ok) {
        throw new Error("Fehler beim Abrufen der Wechselkurse.");
      }
      const data = await response.json() as { rates: Record<string, number> };
      const rates = data.rates;

      // Check if new currency exists in rates
      const rate = rates[upperCode];
      if (!rate) {
        return { error: `Währungscode "${upperCode}" nicht von der API unterstützt.` };
      }

      // Frankfurter returns rates relative to base (1 CHF = X Currency).
      // We need the factor to convert FROM Currency TO CHF (1 Currency = Y CHF).
      // So we invert the rate: 1 / rate.
      await createCurrencySetting(db, { code: upperCode, symbol, conversionFactor: 1 / rate });

      // Update all other currencies if they exist in the rates
      const existingCurrencies = await getCurrencies(db);
      for (const currency of existingCurrencies) {
        const newRate = rates[currency.code];
        if (newRate) {
          await updateCurrencyByCode(db, currency.code, 1 / newRate);
        }
      }

      return { success: `Währung ${upperCode} erstellt und Kurse aktualisiert.` };

    } catch (error) {
      console.error("Currency API Error:", error);
      return { error: "Fehler bei der Kommunikation mit der Wechselkurs-API." };
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

    await updateCurrencySetting(db, id, { code, symbol, conversionFactor });
    return { success: "Währung aktualisiert." };
  }

  if (intent === "deleteCurrency") {
    const id = Number(formData.get("id"));
    if (!id) return { error: "Ungültige ID." };
    await deleteCurrencySetting(db, id);
    return { success: "Währung gelöscht." };
  }

  return null;
}

export default function AdminSettings() {
  const { users, currencies } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [editingCurrencyId, setEditingCurrencyId] = useState<number | null>(null);

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pt-28 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground dark:text-white">
          Admin-Bereich
        </h1>
        <p className="text-secondary dark:text-navy-300">
          Benutzer verwalten und Währungseinstellungen konfigurieren.
        </p>
      </div>

      {actionData && "error" in actionData && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {actionData.error}
        </div>
      )}

      {actionData && "success" in actionData && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
          {(actionData as any).success}
        </div>
      )}

      {/* User Management */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground dark:text-white">
            Benutzerverwaltung
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-secondary dark:bg-navy-900 dark:text-navy-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Benutzername</th>
                <th className="px-4 py-3 font-semibold">E-Mail</th>
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
                  <td className="px-4 py-3">
                    <Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="intent" value="updateUserRole" />
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="rounded-lg border-gray-200 bg-white py-1 pl-2 pr-8 text-xs font-medium focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white"
                      >
                        {USER_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </Form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Form
                      method="post"
                      onSubmit={(e) => {
                        if (!confirm(`Benutzer "${u.username}" wirklich löschen?`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="intent" value="deleteUser" />
                      <input type="hidden" name="userId" value={u.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Benutzer löschen"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Currency Management */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Coins className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-foreground dark:text-white">
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
                      <Form
                        method="post"
                        onSubmit={(e) => {
                          if (!confirm(`Währung "${currency.code}" wirklich löschen?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="intent" value="deleteCurrency" />
                        <input type="hidden" name="id" value={currency.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Form>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}