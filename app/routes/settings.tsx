import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  Link,
} from "react-router";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "~/db/providers/settings.server";
import { getDb } from "~/db";
import {
  requireUser,
  updateUserPassword,
  verifyPassword,
} from "~/services/auth.server";
import type { Route } from "./+types/settings";
import { Button } from "~/components/button";
import { useState } from "react";
import { Pencil, Trash2, Plus, Shield, Server } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const db = await getDb();
  const locations = await getLocations(db, user.id);
  return { locations, user };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const db = await getDb();
  const formData = await request.formData();
  const intent = formData.get("intent");

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

    const isCorrect = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCorrect) {
      return { error: "Das aktuelle Passwort ist falsch." };
    }

    await updateUserPassword(user.id, newPassword);
    return { success: "Passwort erfolgreich geändert." };
  }

  if (intent === "createLocation") {
    const name = formData.get("name") as string;
    if (!name) return { error: "Name ist erforderlich." };
    await createLocation(db, { name, userId: user.id });
    return { success: "Lagerort erstellt." };
  }

  if (intent === "updateLocation") {
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    if (!id || !name) return { error: "Ungültige Daten." };
    await updateLocation(db, id, user.id, { name });
    return { success: "Lagerort aktualisiert." };
  }

  if (intent === "deleteLocation") {
    const id = Number(formData.get("id"));
    if (!id) return { error: "Ungültige ID." };
    await deleteLocation(db, id, user.id);
    return { success: "Lagerort gelöscht." };
  }

  return null;
}

export default function Settings() {
  const { locations, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 pt-28 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground dark:text-white">
          Einstellungen
        </h1>
        <p className="text-secondary dark:text-navy-300">
          Verwalte deine Kontoeinstellungen und Lagerorte.
        </p>
      </div>

      {user.role === "admin" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Administrator-Bereich</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Benutzer verwalten und System-Einstellungen ändern.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => window.location.href = "/settings/admin"}
              className="shrink-0"
            >
              Zum Admin-Bereich
            </Button>
          </div>
        </div>
      )}

      {/* Server Stats Link */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:border-navy-700 dark:bg-navy-800 dark:hover:border-primary/50">
        <Link to="/settings/server-stats" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground dark:text-white">Server Statistiken</h3>
              <p className="text-sm text-secondary dark:text-navy-300">
                Globale Kennzahlen und Systemstatus einsehen.
              </p>
            </div>
          </div>
          <div className="text-secondary dark:text-navy-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
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

      {/* Password Change Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
        <h2 className="mb-4 text-xl font-semibold text-foreground dark:text-white">
          Passwort ändern
        </h2>
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="changePassword" />
          <div className="space-y-1.5">
            <label
              htmlFor="currentPassword"
              className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
            >
              Aktuelles Passwort
            </label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              required
              className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
              >
                Neues Passwort
              </label>
              <input
                type="password"
                name="newPassword"
                id="newPassword"
                required
                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
              >
                Passwort bestätigen
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                required
                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
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

      {/* Storage Locations Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-700 dark:bg-navy-800">
        <h2 className="mb-4 text-xl font-semibold text-foreground dark:text-white">
          Lagerorte verwalten
        </h2>

        {/* Add Location Form */}
        <Form method="post" className="mb-6 flex gap-3">
          <input type="hidden" name="intent" value="createLocation" />
          <input
            type="text"
            name="name"
            placeholder="Neuer Lagerort..."
            required
            className="block w-full flex-1 rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
          />
          <Button type="submit" disabled={isSubmitting} variant="secondary">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Hinzufügen</span>
          </Button>
        </Form>

        <div className="space-y-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200 dark:border-navy-700 dark:bg-navy-900 dark:hover:border-navy-600"
            >
              {editingLocationId === location.id ? (
                <Form
                  method="post"
                  className="flex flex-1 items-center gap-3"
                  onSubmit={() => setEditingLocationId(null)}
                >
                  <input type="hidden" name="intent" value="updateLocation" />
                  <input type="hidden" name="id" value={location.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={location.name}
                    required
                    className="block w-full flex-1 rounded-lg border-gray-200 bg-white p-2 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
                  />
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    Speichern
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingLocationId(null)}
                  >
                    Abbrechen
                  </Button>
                </Form>
              ) : (
                <>
                  <span className="font-medium text-foreground dark:text-white">
                    {location.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingLocationId(location.id)}
                      title="Bearbeiten"
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Form
                      method="post"
                      onSubmit={(e) => {
                        if (!confirm("Lagerort wirklich löschen?")) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="intent" value="deleteLocation" />
                      <input type="hidden" name="id" value={location.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Löschen"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Form>
                  </div>
                </>
              )}
            </div>
          ))}
          {locations.length === 0 && (
            <p className="py-4 text-center text-sm text-secondary dark:text-navy-400">
              Keine Lagerorte vorhanden.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
