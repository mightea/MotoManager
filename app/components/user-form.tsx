import { Form, useNavigation } from "react-router";
import { Button } from "./button";
import type { PublicUser } from "~/types/auth";
import { USER_ROLES } from "~/types/auth";
import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

interface UserFormProps {
  initialData?: PublicUser | null;
  onSubmit?: () => void;
  onCancel?: () => void;
  isSelf?: boolean;
}

export function UserForm({ initialData, onSubmit, onCancel, isSelf }: UserFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isSubmitting && navigation.state === "idle" && onSubmit) {
      // Logic to close modal after successful submit can be handled here or by onSubmit callback
    }
  }, [isSubmitting, navigation.state, onSubmit]);

  return (
    <Form
      method="post"
      ref={formRef}
      className="space-y-4"
      onSubmit={() => {
        // Here we could add client-side validation if needed
      }}
    >
      <input type="hidden" name="intent" value={initialData ? "updateUser" : "createUser"} />
      {initialData && <input type="hidden" name="userId" value={initialData.id} />}

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label
            htmlFor="user-name"
            className="text-xs font-semibold uppercase text-secondary dark:text-navy-300"
          >
            Anzeigename
          </label>
          <input
            id="user-name"
            name="name"
            type="text"
            defaultValue={initialData?.name}
            required
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
            placeholder="z.B. Max Mustermann"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="user-username"
              className="text-xs font-semibold uppercase text-secondary dark:text-navy-300"
            >
              Benutzername
            </label>
            <input
              id="user-username"
              name="username"
              type="text"
              defaultValue={initialData?.username}
              required
              className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
              placeholder="z.B. max"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="user-email"
              className="text-xs font-semibold uppercase text-secondary dark:text-navy-300"
            >
              E-Mail
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              defaultValue={initialData?.email}
              required
              className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
              placeholder="max@example.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="user-password"
            className="text-xs font-semibold uppercase text-secondary dark:text-navy-300"
          >
            {initialData ? "Neues Passwort (optional)" : "Passwort"}
          </label>
          <input
            id="user-password"
            name="password"
            type="password"
            required={!initialData}
            minLength={8}
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
            placeholder="••••••••"
          />
          {initialData && (
            <p className="mt-1 text-xs text-secondary dark:text-navy-400">
              Leer lassen, um das aktuelle Passwort zu behalten.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="user-role"
            className="text-xs font-semibold uppercase text-secondary dark:text-navy-300"
          >
            Rolle
          </label>
          <select
            id="user-role"
            name="role"
            defaultValue={initialData?.role ?? "user"}
            disabled={isSelf}
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary disabled:opacity-50 dark:border-navy-600 dark:bg-navy-800 dark:text-white"
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {isSelf && (
            <p className="mt-1 text-xs text-secondary dark:text-navy-400">
              Du kannst deine eigene Rolle nicht ändern.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
        {initialData && !isSelf && (
          <Button
            type="submit"
            name="intent"
            value="deleteUser"
            variant="ghost"
            className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 sm:mr-auto"
            onClick={(e) => {
              if (!confirm(`Benutzer "${initialData.username}" wirklich löschen?`)) {
                e.preventDefault();
              }
            }}
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        )}
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="sm:w-32"
          >
            Abbrechen
          </Button>
        )}
        <Button
          type="submit"
          className="sm:w-32"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Wird gespeichert..." : initialData ? "Aktualisieren" : "Erstellen"}
        </Button>
      </div>
    </Form>
  );
}
