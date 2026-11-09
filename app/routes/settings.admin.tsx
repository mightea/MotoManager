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
  deleteUser,
  listUsers,
  requireAdmin,
  requireUser,
  startImpersonation,
  updateUser,
  updateUserPassword,
} from "~/services/auth";
import { listBackups, triggerBackup, type BackupOverview } from "~/services/backups";
import { USER_ROLES, type UserRole } from "~/types/auth";
import type { CurrencySetting } from "~/types/db";
import type { Route } from "./+types/settings.admin";
import { Button } from "~/components/button";
import { PageHeader } from "~/components/page-header";
import { useConfirm } from "~/components/confirm-provider";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Pencil, Trash2, Plus, UserPlus, UserCog, ArrowRight } from "lucide-react";
import { UserDialog } from "~/components/user-dialog";
import type { PublicUser } from "~/types/auth";
import { ApiError, fetchFromBackend } from "~/utils/backend";
import { getVersion } from "~/config";
import { formatNumber } from "~/utils/numberUtils";
import {
  DATE_TIME,
  MICRO_LABEL,
  SectionHead,
  StatusStrip,
  backupNote,
  formatAppVersion,
  formatRecent,
  latestAppBuild,
  latestSuccessfulBackup,
  relativeDays,
  type StatusItem,
} from "~/components/admin/admin-ui";
import { AdminSectionNav, type AdminSection } from "~/components/admin/section-nav";
import { BackupStrip } from "~/components/admin/backup-strip";

export function meta() {
  return [
    { title: "Admin-Bereich - Moto Manager" },
    { name: "description", content: "Systemweite Verwaltung von Benutzern und Währungen." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  requireAdmin(user);

  // Health, backups and the document count are context for the status strip
  // and the cards — a failure there must not take the admin page down.
  const [users, currencies, appUpgrade, health, backups, stats] = await Promise.all([
    listUsers(token),
    getCurrencies(),
    getAppUpgradeSettings(token),
    fetchFromBackend<{ status: string; version: string }>("/health").catch(() => null),
    listBackups(token).catch((): BackupOverview | null => null),
    fetchFromBackend<{ stats: { global: { documents: number } } }>("/stats", {}, token).catch(() => null),
  ]);

  return {
    users,
    currencies,
    appUpgrade,
    user,
    health,
    backups,
    documentCount: stats?.stats.global.documents ?? null,
  };
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

    try {
      await deleteUser(userId, token);
      return { success: "Benutzer gelöscht." };
    } catch (e) {
      return { error: (e instanceof Error && e.message) || "Fehler beim Löschen des Benutzers." };
    }
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

  if (intent === "createBackup") {
    try {
      await triggerBackup(token, getVersion());
      return { success: "Backup erfolgreich erstellt." };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        return { error: "Es läuft bereits ein Backup." };
      }
      return { error: e instanceof Error ? e.message : "Backup fehlgeschlagen." };
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

const OUTLINE_LINK =
  "inline-flex h-10 items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3.5 font-display text-xs uppercase tracking-[0.12em] text-base-content transition-colors hover:border-base-content/35 dark:border-navy-700 dark:bg-navy-800 dark:text-white";

const INPUT =
  "block h-10 w-full rounded-sm border border-base-content/20 bg-base-100 px-2.5 font-mono text-[15px] text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-600 dark:bg-navy-900 dark:text-white";

const SECTION = "scroll-mt-28 rounded-sm border border-base-300/70 bg-base-100 dark:border-navy-700 dark:bg-navy-800";

// Avatar fills cycle through the palette so users are told apart at a glance.
const AVATAR_FILLS = [
  "bg-primary text-primary-content",
  "bg-secondary text-secondary-content",
  "bg-[var(--color-workshop)] text-[var(--color-workshop-ink)]",
  "bg-neutral text-neutral-content",
];

export default function AdminSettings() {
  const {
    users = [],
    currencies = [],
    appUpgrade,
    user: currentUser,
    health,
    backups,
    documentCount,
  } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const submit = useSubmit();

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

  const latest = latestAppBuild(users);
  const appUsers = users.filter((u) => u.appBuild != null);
  const outdated = latest ? appUsers.filter((u) => (u.appBuild ?? 0) < latest.build) : [];
  const lastBackup = latestSuccessfulBackup(backups?.backups);
  const archiveCount = backups?.backups.filter((b) => b.status === "success" && b.filePath).length ?? null;
  const healthy = health?.status === "ok";

  const status: StatusItem[] = [
    {
      label: "API",
      value: health?.version ?? "–",
      note: healthy ? "Status ok" : "nicht erreichbar",
      tone: healthy ? "ok" : "warn",
      toneNote: true,
    },
    lastBackup && !lastBackup.frontendVersion
      ? { label: "Web-App", value: getVersion(), note: "Im letzten Backup ohne FE-Version", tone: "warn", toneNote: true }
      : { label: "Web-App", value: getVersion(), note: "diese Oberfläche", tone: "ok" },
    {
      label: "Letztes Backup",
      value: backups?.lastSuccessAt ? formatRecent(backups.lastSuccessAt) : "–",
      note: lastBackup ? backupNote(lastBackup) : backups ? "noch keins" : "nicht abrufbar",
      tone: backups?.lastSuccessAt ? "ok" : "warn",
      toneNote: !backups?.lastSuccessAt,
    },
    latest
      ? {
          label: "iOS-App",
          value: formatAppVersion(latest.version, latest.build),
          note:
            outdated.length > 0
              ? `${outdated.length} von ${appUsers.length} App-Nutzern auf älterem Build`
              : "alle App-Nutzer aktuell",
          tone: outdated.length > 0 ? "warn" : "ok",
          toneNote: true,
        }
      : { label: "iOS-App", value: "–", note: "keine App-Nutzer", tone: "muted" },
  ];

  const context = [
    `${users.length} Benutzer`,
    health?.version ? `API ${health.version}` : null,
    backups?.lastSuccessAt ? `letztes Backup ${formatRecent(backups.lastSuccessAt)}` : null,
  ].filter(Boolean).join(" · ");

  const sections: AdminSection[] = [
    { id: "benutzer", label: "Benutzer", count: String(users.length) },
    { id: "ios-app", label: "iOS-App-Updates" },
    { id: "waehrungen", label: "Währungen", count: String(currencies.length) },
    ...(backups ? [{ id: "backups", label: "Backups", count: archiveCount != null ? String(archiveCount) : undefined }] : []),
    { id: "wartung", label: "Systemwartung" },
    { id: "server-stats", label: "Server-Statistiken", count: "→", to: "/settings/server-stats" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pt-4 pb-20 sm:pt-10">
      <PageHeader
        eyebrow="Konfiguration › Admin"
        title="Admin-Bereich"
        description={<span suppressHydrationWarning>{context}</span>}
        actions={
          <Link to="/settings/server-stats" className={OUTLINE_LINK}>
            Server-Statistiken
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <StatusStrip label="Systemstatus" items={status} />

      {actionData && "error" in actionData && (
        <div role="alert" className="rounded-sm border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {actionData.error}
        </div>
      )}

      {actionData && "success" in actionData && (
        <output className="block rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {actionData.success}
        </output>
      )}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <AdminSectionNav sections={sections} />

        <div className="flex min-w-0 flex-col gap-4">
          {/* 01 · Benutzer */}
          <section id="benutzer" aria-labelledby="benutzer-h" className={SECTION}>
            <SectionHead
              id="benutzer-h"
              title="Benutzer"
              count={users.length}
              actions={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingUser(null);
                    setIsUserDialogOpen(true);
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Benutzer
                </Button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-base-300 dark:border-navy-700">
                    <th scope="col" className={clsx(MICRO_LABEL, "px-4 py-2.5 tracking-[0.1em]")}>Benutzer</th>
                    <th scope="col" className={clsx(MICRO_LABEL, "px-3 py-2.5 tracking-[0.1em]")}>Zuletzt aktiv</th>
                    <th scope="col" className={clsx(MICRO_LABEL, "px-3 py-2.5 tracking-[0.1em]")}>iOS-App</th>
                    <th scope="col" className={clsx(MICRO_LABEL, "px-3 py-2.5 tracking-[0.1em]")}>Rolle</th>
                    <th scope="col" className="px-4 py-2.5">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 dark:divide-navy-700">
                  {users.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      latestBuild={latest?.build ?? null}
                      isSelf={u.id === currentUser.id}
                      onEdit={() => {
                        setEditingUser(u);
                        setIsUserDialogOpen(true);
                      }}
                      onImpersonate={() =>
                        submit({ intent: "impersonate", userId: String(u.id) }, { method: "post" })
                      }
                    />
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

          <div className="grid items-start gap-4 md:grid-cols-2">
            {/* 02 · iOS-App-Updates */}
            <AppUpgradeCard
              users={users}
              latest={latest}
              saved={appUpgrade}
              isSubmitting={isSubmitting}
            />
            {/* 03 · Währungen */}
            <CurrenciesCard currencies={currencies} />
          </div>

          {/* 04 · Backups */}
          {backups && <BackupsCard overview={backups} isSubmitting={isSubmitting} />}

          {/* 05 · Systemwartung */}
          <section
            id="wartung"
            aria-labelledby="wartung-h"
            className={clsx(SECTION, "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5")}
          >
            <div className="min-w-0">
              <h2 id="wartung-h" className="text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-base-content dark:text-white">
                Systemwartung
              </h2>
              <p className="text-[13px] text-base-content/70 dark:text-navy-400">
                PDF-Vorschaubilder neu erzeugen
                {documentCount != null && ` — ${formatNumber(documentCount)} Dokumente auf dem Server`}. Dauert
                einige Zeit.
              </p>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="regeneratePreviews" />
              <Button type="submit" variant="secondary" size="sm" disabled={isSubmitting}>
                {isSubmitting && navigation.formData?.get("intent") === "regeneratePreviews"
                  ? "Arbeite…"
                  : "Vorschauen neu erzeugen"}
              </Button>
            </Form>
          </section>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user: u,
  latestBuild,
  isSelf,
  onEdit,
  onImpersonate,
}: {
  user: PublicUser;
  latestBuild: number | null;
  isSelf: boolean;
  onEdit: () => void;
  onImpersonate: () => void;
}) {
  const appTag =
    u.appBuild == null
      ? null
      : latestBuild != null && u.appBuild < latestBuild
        ? { label: "Veraltet", className: "text-warning" }
        : { label: "Aktuell", className: "text-success" };

  return (
    <tr className="hover:bg-base-200/60 dark:hover:bg-navy-700/40">
      <td className="px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center font-mono font-bold",
              AVATAR_FILLS[u.id % AVATAR_FILLS.length],
            )}
          >
            {(u.name || u.username).charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold text-base-content dark:text-white">{u.username}</span>
            <span className="truncate font-mono text-xs text-base-content/70 dark:text-navy-400">{u.email}</span>
          </span>
        </span>
      </td>
      <td suppressHydrationWarning className="px-3 py-3">
        {u.lastLoginAt ? (
          <span className="flex flex-col">
            <span className="text-sm text-base-content dark:text-white">{relativeDays(u.lastLoginAt)}</span>
            <span className="font-mono text-xs text-base-content/70 dark:text-navy-400">
              {DATE_TIME.format(new Date(u.lastLoginAt)).replace(",", "")}
            </span>
          </span>
        ) : (
          <span className="text-sm text-base-content/70 dark:text-navy-400">nie</span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-[13px] text-base-content dark:text-white">
            {u.appBuild != null || u.appVersion ? formatAppVersion(u.appVersion, u.appBuild) : "—"}
          </span>
          <span
            className={clsx(
              "font-mono text-[11px] font-bold uppercase tracking-[0.08em]",
              appTag?.className ?? "text-base-content/70 dark:text-navy-400",
            )}
          >
            {appTag?.label ?? "Keine App"}
          </span>
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={clsx(
            "inline-block px-2 py-[3px] font-mono text-[11px] font-bold uppercase tracking-[0.1em]",
            u.role === "admin"
              ? "bg-base-content text-base-100"
              : "border border-base-300 text-base-content/70 dark:border-navy-600 dark:text-navy-300",
          )}
        >
          {u.role}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <span className="inline-flex gap-1.5">
          <IconButton label={`${u.username} bearbeiten`} onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          {!isSelf && (
            <IconButton label={`Als ${u.username} ansehen (Support-Modus)`} onClick={onImpersonate}>
              <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          )}
        </span>
      </td>
    </tr>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm border border-base-300 bg-base-100 text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

function AppUpgradeCard({
  users,
  latest,
  saved,
  isSubmitting,
}: {
  users: PublicUser[];
  latest: { build: number; version: string | null } | null;
  saved: { softUpgradeBuild: number; hardUpgradeBuild: number };
  isSubmitting: boolean;
}) {
  const [softBuild, setSoftBuild] = useState(String(saved.softUpgradeBuild));
  const [hardBuild, setHardBuild] = useState(String(saved.hardUpgradeBuild));
  const soft = Number(softBuild);
  const hard = Number(hardBuild);
  const softHits = users.filter((u) => u.appBuild != null && u.appBuild <= soft);
  const hardHits = users.filter((u) => u.appBuild != null && u.appBuild < hard);

  const savedLine = [
    saved.softUpgradeBuild > 0 ? `Erinnerung bis ${saved.softUpgradeBuild}` : "Erinnerung aus",
    saved.hardUpgradeBuild > 0 ? `Sperre unter ${saved.hardUpgradeBuild}` : "Sperre aus",
  ].join(" · ");

  return (
    <section id="ios-app" aria-labelledby="ios-app-h" className={SECTION}>
      <SectionHead
        id="ios-app-h"
        title="iOS-App-Updates"
        description={
          <>
            {latest
              ? `Aktuellster Build im Einsatz: ${latest.build}${latest.version ? ` (${latest.version})` : ""}. `
              : "Noch kein App-Login erfasst. "}
            0 = Prüfung aus.
          </>
        }
      />
      <Form method="post">
        <input type="hidden" name="intent" value="updateAppUpgrade" />
        <div className="grid grid-cols-2 gap-3 px-4 py-3.5">
          <label htmlFor="soft-upgrade-build" className={clsx(MICRO_LABEL, "flex flex-col gap-1 tracking-[0.1em]")}>
            Erinnerung bis Build
            <input
              id="soft-upgrade-build"
              type="number"
              name="softUpgradeBuild"
              min="0"
              step="1"
              value={softBuild}
              onChange={(event) => setSoftBuild(event.target.value)}
              aria-describedby="app-upgrade-help"
              required
              className={INPUT}
            />
          </label>
          <label htmlFor="hard-upgrade-build" className={clsx(MICRO_LABEL, "flex flex-col gap-1 tracking-[0.1em]")}>
            Sperre unter Build
            <input
              id="hard-upgrade-build"
              type="number"
              name="hardUpgradeBuild"
              min="0"
              step="1"
              value={hardBuild}
              onChange={(event) => setHardBuild(event.target.value)}
              aria-describedby="app-upgrade-help"
              required
              className={INPUT}
            />
          </label>
          <p id="app-upgrade-help" className="col-span-2 text-xs text-base-content/70 dark:text-navy-400">
            Builds bis einschliesslich der Erinnerungs-Grenze sehen nach dem Login einen Update-Hinweis. Builds unter
            der Sperr-Grenze stellen keine Anfragen mehr an den Server.
          </p>
        </div>
        <p
          aria-live="polite"
          className="mx-4 mb-3.5 border border-[var(--color-workshop)]/50 bg-[var(--color-workshop)]/10 px-3 py-2.5 text-[13px] text-base-content dark:text-navy-100"
        >
          <strong>Vorschau:</strong>{" "}
          {soft > 0 ? (
            <>
              Erinnerung trifft <strong>{describeUsers(softHits)}</strong>
              {softHits.length > 0 && ` (Build ≤ ${soft})`}.
            </>
          ) : (
            "Keine Erinnerung."
          )}{" "}
          {hard > 0 ? (
            <>
              Sperre trifft <strong>{describeUsers(hardHits)}</strong>.
            </>
          ) : (
            "Keine Sperre."
          )}
        </p>
        <div className="flex items-center justify-between gap-2 px-4 pb-3.5">
          <span className={MICRO_LABEL}>Gespeichert: {savedLine}</span>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            Speichern
          </Button>
        </div>
      </Form>
    </section>
  );
}

function CurrenciesCard({ currencies }: { currencies: CurrencySetting[] }) {
  const submit = useSubmit();
  const confirmDialog = useConfirm();
  const [editingCurrencyId, setEditingCurrencyId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section id="waehrungen" aria-labelledby="waehrungen-h" className={SECTION}>
      <SectionHead
        id="waehrungen-h"
        title="Währungen"
        // The server fetches every rate relative to CHF (frankfurter.app, from=CHF).
        description="Basis CHF · Kurse automatisch"
        actions={
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={isAdding}
            aria-controls="currency-add-form"
            onClick={() => setIsAdding((open) => !open)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Währung
          </Button>
        }
      />

      {isAdding && (
        <Form
          id="currency-add-form"
          method="post"
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 border-b border-base-200 bg-base-200/50 px-4 py-3 dark:border-navy-700 dark:bg-navy-900/50"
          onSubmit={() => setIsAdding(false)}
        >
          <input type="hidden" name="intent" value="createCurrency" />
          <label htmlFor="currency-code" className={clsx(MICRO_LABEL, "flex flex-col gap-1")}>
            Code
            <input id="currency-code" type="text" name="code" placeholder="z.B. USD" required className={INPUT} />
          </label>
          <label htmlFor="currency-symbol" className={clsx(MICRO_LABEL, "flex flex-col gap-1")}>
            Symbol
            <input id="currency-symbol" type="text" name="symbol" placeholder="z.B. $" required className={INPUT} />
          </label>
          <Button type="submit" size="md">
            Hinzufügen
          </Button>
        </Form>
      )}

      {currencies.length === 0 ? (
        <p className="px-4 py-4 text-sm text-base-content/70 dark:text-navy-400">Noch keine Währungen erfasst.</p>
      ) : (
        <ul className="divide-y divide-base-200 dark:divide-navy-700">
          {currencies.map((currency) =>
            editingCurrencyId === currency.id ? (
              <li key={currency.id} className="px-4 py-3">
                <Form method="post" className="space-y-2" onSubmit={() => setEditingCurrencyId(null)}>
                  <input type="hidden" name="intent" value="updateCurrency" />
                  <input type="hidden" name="id" value={currency.id} />
                  <div className="grid grid-cols-3 gap-2">
                    <label className={clsx(MICRO_LABEL, "flex flex-col gap-1")}>
                      Code
                      <input type="text" name="code" defaultValue={currency.code} required className={INPUT} />
                    </label>
                    <label className={clsx(MICRO_LABEL, "flex flex-col gap-1")}>
                      Symbol
                      <input type="text" name="symbol" defaultValue={currency.symbol} required className={INPUT} />
                    </label>
                    <label className={clsx(MICRO_LABEL, "flex flex-col gap-1")}>
                      Faktor
                      <input
                        type="number"
                        name="conversionFactor"
                        step="0.0001"
                        defaultValue={currency.conversionFactor}
                        required
                        className={INPUT}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCurrencyId(null)}>
                      Abbrechen
                    </Button>
                    <Button type="submit" size="sm">
                      Speichern
                    </Button>
                  </div>
                </Form>
              </li>
            ) : (
              <li
                key={currency.id}
                className="grid grid-cols-[3.5rem_2.75rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5"
              >
                <span className="font-mono font-bold text-base-content dark:text-white">{currency.code}</span>
                <span className="font-mono text-base-content/70 dark:text-navy-400">{currency.symbol}</span>
                <span className="truncate text-[13px] text-base-content/70 dark:text-navy-400">
                  {currency.code === "CHF" ? "Basiswährung" : (currency.label ?? "")}
                </span>
                <span className="font-mono font-bold text-base-content dark:text-white">
                  {formatNumber(currency.conversionFactor, 2)}
                </span>
                <span className="flex gap-1">
                  <IconButton label={`Währung ${currency.code} bearbeiten`} onClick={() => setEditingCurrencyId(currency.id)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Währung ${currency.code} löschen`}
                    className="text-error hover:text-error dark:text-error"
                    onClick={async () => {
                      const ok = await confirmDialog({
                        title: "Währung löschen?",
                        description: `Währung "${currency.code}" wirklich löschen?`,
                      });
                      if (!ok) return;
                      submit({ intent: "deleteCurrency", id: String(currency.id) }, { method: "post" });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function BackupsCard({ overview, isSubmitting }: { overview: BackupOverview; isSubmitting: boolean }) {
  const { config, running, nextScheduledAt, backups } = overview;
  const description = config.enabled
    ? [
        `Alle ${config.intervalHours} h`,
        `${config.keep} Archive aufbewahrt`,
        nextScheduledAt ? `nächstes ${DATE_TIME.format(new Date(nextScheduledAt)).replace(",", "")}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : `Automatik aus · ${config.keep} Archive aufbewahrt · manuell weiterhin möglich`;

  return (
    <section id="backups" aria-labelledby="backups-h" className={SECTION}>
      <SectionHead
        id="backups-h"
        title="Backups"
        description={description}
        actions={
          <>
            <Link to="/settings/backups" className={clsx(OUTLINE_LINK, "h-8 px-3 text-[11px]")}>
              Verlauf
            </Link>
            <Form method="post">
              <input type="hidden" name="intent" value="createBackup" />
              <Button type="submit" size="sm" disabled={isSubmitting || running}>
                {running ? "Läuft…" : "Jetzt sichern"}
              </Button>
            </Form>
          </>
        }
      />
      <BackupStrip backups={backups} />
    </section>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
