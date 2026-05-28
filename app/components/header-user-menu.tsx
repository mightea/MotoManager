import { Link, useNavigate, useSubmit } from "react-router";
import { ChevronDown, LogOut, Settings, Shield } from "lucide-react";
import { type PublicUser } from "~/types/auth";
import { DropdownMenu } from "./dropdown-menu";

interface HeaderUserMenuProps {
  user: PublicUser | null;
}

export function HeaderUserMenu({ user }: HeaderUserMenuProps) {
  const navigate = useNavigate();
  const submit = useSubmit();

  const handleLogout = () => {
    submit(null, { action: "/auth/logout", method: "post" });
  };

  if (!user) {
    return (
      <Link
        to="/auth/login"
        className="relative hidden h-10 items-center rounded-sm bg-primary px-4 font-display text-sm uppercase tracking-wider text-primary-content shadow-[0_8px_18px_-10px_rgba(0,138,201,0.7)] transition-all hover:brightness-105 md:inline-flex"
      >
        Login
        <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
      </Link>
    );
  }

  return (
    <div className="hidden md:block">
      <DropdownMenu
        align="end"
        trigger={
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-sm border border-base-content/15 bg-base-100 py-1.5 pl-1.5 pr-3 transition-all hover:border-base-content/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-navy-800"
            aria-label="Benutzermenü"
          >
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-primary/15 font-mono text-xs font-semibold uppercase tracking-wider text-primary dark:bg-primary/25 dark:text-primary-light">
              {user.username.charAt(0).toUpperCase()}
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/80">
              {user.username}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-base-content/50" />
          </button>
        }
      >
        <DropdownMenu.Label>Konto</DropdownMenu.Label>
        <DropdownMenu.Item
          icon={<Settings className="h-4 w-4" />}
          onSelect={() => navigate("/settings")}
        >
          Einstellungen
        </DropdownMenu.Item>
        {user.role === "admin" && (
          <DropdownMenu.Item
            icon={<Shield className="h-4 w-4" />}
            onSelect={() => navigate("/settings/admin")}
          >
            Admin-Bereich
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          variant="destructive"
          icon={<LogOut className="h-4 w-4" />}
          onSelect={handleLogout}
        >
          Abmelden
        </DropdownMenu.Item>
      </DropdownMenu>
    </div>
  );
}
