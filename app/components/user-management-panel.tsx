import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import type { PublicUser, UserRole } from "~/types/auth";

interface UserManagementPanelProps {
  users: PublicUser[];
  currentUserId: number;
  roles: readonly UserRole[];
}

export function UserManagementPanel({
  users,
  currentUserId,
  roles,
}: UserManagementPanelProps) {
  const createFetcher = useFetcher();
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (
      createFetcher.state === "idle" &&
      createFetcher.data?.intent === "user-create" &&
      createFetcher.data.success
    ) {
      createFormRef.current?.reset();
    }
  }, [createFetcher.state, createFetcher.data]);

  const createError =
    createFetcher.data?.intent === "user-create" && !createFetcher.data.success
      ? createFetcher.data.message
      : null;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("de-CH", {
        dateStyle: "medium",
      }),
    [],
  );

  return (
    <Card className="border-border/60 bg-white/90 shadow-md backdrop-blur dark:border-border/30 dark:bg-slate-900/80">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Benutzerverwaltung
        </CardTitle>
        <CardDescription>
          Lege neue Zugänge an, passe Rollen an oder setze Passwörter zurück.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            Neuen Benutzer hinzufügen
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Erstelle Zugänge für weitere Personen in deiner Garage.
          </p>
          <createFetcher.Form
            ref={createFormRef}
            method="post"
            className="mt-4 grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="intent" value="user-create" />
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                name="name"
                placeholder="z.B. Anna Meier"
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-username">Benutzername</Label>
              <Input
                id="user-username"
                name="username"
                placeholder="anna.meier"
                required
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">
                3-32 Zeichen, nur Buchstaben, Zahlen sowie ._-.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">E-Mail</Label>
              <Input
                id="user-email"
                name="email"
                type="email"
                placeholder="anna@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Startpasswort</Label>
              <Input
                id="user-password"
                name="password"
                type="password"
                placeholder="Mindestens 8 Zeichen"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rolle</Label>
              <Select name="role" defaultValue="user">
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="Rolle wählen" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === "admin" ? "Administrator" : "Benutzer"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              {createError ? (
                <p className="text-sm text-destructive">{createError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Du kannst das Passwort später jederzeit ändern.
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={createFetcher.state === "submitting"}
              >
                {createFetcher.state === "submitting"
                  ? "Wird angelegt..."
                  : "Benutzer erstellen"}
              </Button>
            </div>
          </createFetcher.Form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Bestehende Benutzer
              </h3>
              <p className="text-sm text-muted-foreground">
                Ändere Rollen, setze Passwörter zurück oder entferne Zugänge.
              </p>
            </div>
            <Badge variant="outline">{users.length} aktiv</Badge>
          </div>

          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine weiteren Benutzer angelegt.
              </p>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  roles={roles}
                  currentUserId={currentUserId}
                  dateFormatter={dateFormatter}
                />
              ))
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

interface UserRowProps {
  user: PublicUser;
  roles: readonly UserRole[];
  currentUserId: number;
  dateFormatter: Intl.DateTimeFormat;
}

function UserRow({ user, roles, currentUserId, dateFormatter }: UserRowProps) {
  const roleFetcher = useFetcher();
  const passwordFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const [role, setRole] = useState<UserRole>(user.role as UserRole);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  useEffect(() => {
    queueMicrotask(() => setRole(user.role as UserRole));
  }, [user.role]);

  useEffect(() => {
    if (
      roleFetcher.state === "idle" &&
      roleFetcher.data?.intent === "user-update-role" &&
      !roleFetcher.data.success
    ) {
      queueMicrotask(() => setRole(user.role as UserRole));
    }
  }, [roleFetcher.state, roleFetcher.data, user.role]);

  useEffect(() => {
    if (
      passwordFetcher.state === "idle" &&
      passwordFetcher.data?.intent === "user-reset-password" &&
      passwordFetcher.data.success
    ) {
      queueMicrotask(() => {
        setPasswordValue("");
        setPasswordOpen(false);
      });
    }
  }, [passwordFetcher.state, passwordFetcher.data]);

  useEffect(() => {
    if (
      deleteFetcher.state === "idle" &&
      deleteFetcher.data?.intent === "user-delete" &&
      deleteFetcher.data.success
    ) {
      queueMicrotask(() => setDeleteOpen(false));
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  const roleError =
    roleFetcher.data?.intent === "user-update-role" && !roleFetcher.data.success
      ? roleFetcher.data.message
      : null;

  const passwordError =
    passwordFetcher.data?.intent === "user-reset-password" &&
    !passwordFetcher.data.success
      ? passwordFetcher.data.message
      : null;

  const deleteError =
    deleteFetcher.data?.intent === "user-delete" && !deleteFetcher.data.success
      ? deleteFetcher.data.message
      : null;

  const formattedDate = useMemo(() => {
    try {
      return dateFormatter.format(new Date(user.createdAt));
    } catch {
      return user.createdAt;
    }
  }, [dateFormatter, user.createdAt]);

  const handleRoleChange = (nextRole: string) => {
    const normalized = nextRole as UserRole;
    setRole(normalized);
    roleFetcher.submit(
      {
        intent: "user-update-role",
        userId: user.id,
        role: normalized,
      },
      { method: "post" },
    );
  };

  const isCurrentUser = user.id === currentUserId;

  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-4 shadow-sm dark:border-border/30 dark:bg-slate-900/60">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground md:hidden">
            Aktiv seit {formattedDate}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex items-center gap-2">
            <Select
              value={role}
              onValueChange={handleRoleChange}
              disabled={roleFetcher.state === "submitting"}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "admin" ? "Administrator" : "Benutzer"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">
              {role === "admin" ? "Admin" : "Benutzer"}
            </Badge>
          </div>
          {roleError && <p className="text-xs text-destructive">{roleError}</p>}
          <p className="hidden text-xs text-muted-foreground md:block">
            Aktiv seit {formattedDate}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Passwort setzen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Passwort {isCurrentUser ? "ändern" : "zurücksetzen"}
              </DialogTitle>
              <DialogDescription>
                Lege ein neues Passwort mit mindestens 8 Zeichen fest.
              </DialogDescription>
            </DialogHeader>
            <passwordFetcher.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="user-reset-password" />
              <input type="hidden" name="userId" value={user.id} />
              <div className="space-y-2">
                <Label htmlFor={`password-${user.id}`}>Neues Passwort</Label>
                <Input
                  id={`password-${user.id}`}
                  name="password"
                  type="password"
                  value={passwordValue}
                  onChange={(event) => setPasswordValue(event.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={passwordFetcher.state === "submitting"}
                >
                  {passwordFetcher.state === "submitting"
                    ? "Speichern..."
                    : "Passwort speichern"}
                </Button>
              </DialogFooter>
            </passwordFetcher.Form>
          </DialogContent>
        </Dialog>

        {!isCurrentUser && (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteFetcher.state === "submitting"}
              >
                Entfernen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Benutzer wirklich entfernen?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Dadurch verliert {user.name} sofort den Zugriff auf MotoManager.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteFetcher.submit(
                      {
                        intent: "user-delete",
                        userId: user.id,
                      },
                      { method: "post" },
                    )
                  }
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Entfernen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
