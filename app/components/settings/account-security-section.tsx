import { Form, useSubmit } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/button";
import { useConfirm } from "~/components/confirm-provider";
import { registerPasskey } from "~/utils/webauthn";
import type { Authenticator } from "~/types/db";
import { MICRO_LABEL, SETTINGS_INPUT, SettingsSection } from "./section";

/**
 * "Konto & Sicherheit": password change on the left, passkeys on the right,
 * stacked on narrow screens.
 */
export function AccountSecuritySection({
  authenticators,
  isSubmitting,
}: {
  authenticators: Authenticator[];
  isSubmitting: boolean;
}) {
  const submit = useSubmit();
  const confirmDialog = useConfirm();

  const addPasskey = async () => {
    try {
      await registerPasskey();
      window.location.reload();
    } catch (err) {
      alert(
        "Fehler beim Erstellen des Passkeys: " +
          (err instanceof Error ? err.message : "Unbekannt"),
      );
    }
  };

  return (
    <SettingsSection id="konto" title="Konto & Sicherheit">
      <div className="flex flex-wrap">
        <Form
          method="post"
          className="flex min-w-0 flex-[1_1_340px] flex-col gap-3 border-b border-base-200 p-4 dark:border-navy-700 md:border-b-0 md:border-r"
        >
          <input type="hidden" name="intent" value="changePassword" />
          <h3 className={MICRO_LABEL}>Passwort ändern</h3>
          <div className="space-y-1">
            <label htmlFor="currentPassword" className={MICRO_LABEL}>
              Aktuelles Passwort
            </label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              autoComplete="current-password"
              required
              className={SETTINGS_INPUT}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="newPassword" className={MICRO_LABEL}>
                Neues Passwort
              </label>
              <input
                type="password"
                name="newPassword"
                id="newPassword"
                autoComplete="new-password"
                required
                className={SETTINGS_INPUT}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className={MICRO_LABEL}>
                Bestätigen
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                autoComplete="new-password"
                required
                className={SETTINGS_INPUT}
              />
            </div>
          </div>
          <Button type="submit" className="self-start" disabled={isSubmitting}>
            Passwort speichern
          </Button>
        </Form>

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className={MICRO_LABEL}>Passkeys</h3>
            <Button type="button" variant="outline" size="sm" onClick={addPasskey}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Hinzufügen
            </Button>
          </div>

          {authenticators.length === 0 ? (
            <p className="rounded-sm border border-dashed border-base-300 px-3 py-3 text-sm text-base-content/70 dark:border-navy-700 dark:text-navy-400">
              Keine Passkeys registriert.
            </p>
          ) : (
            <ul className="space-y-2">
              {authenticators.map((auth) => (
                <li
                  key={auth.id}
                  className="flex items-center gap-3 rounded-sm border border-base-200 px-3 py-2.5 dark:border-navy-700"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-base-content dark:text-white">
                      {auth.deviceType === "single_device"
                        ? "Sicherheitsschlüssel / Gerät"
                        : "Multi-Device Passkey"}
                    </span>
                    <span className="truncate font-mono text-xs text-base-content/70 dark:text-navy-400">
                      ID {auth.id ? `${auth.id.slice(0, 8).toUpperCase()}…` : "—"}
                      {auth.createdAt &&
                        ` · registriert ${new Date(auth.createdAt).toLocaleDateString("de-CH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}`}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-error/10 hover:text-error"
                    aria-label="Passkey entfernen"
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: "Passkey entfernen?",
                        description: "Passkey wirklich entfernen?",
                      });
                      if (!ok) return;
                      submit({ intent: "deleteAuthenticator", id: auth.id ?? "" }, { method: "post" });
                    }}
                  >
                    Entfernen
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-base-content/70 dark:text-navy-400">
            Logge dich schneller und sicherer mit Biometrie ein.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
