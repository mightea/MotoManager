import { Link, useNavigate, useSubmit } from "react-router";
import { ChevronDown, LogOut, Settings, Shield } from "lucide-react";
import clsx from "clsx";
import { type PublicUser } from "~/types/auth";
import { DropdownMenu } from "./dropdown-menu";

interface HeaderUserMenuProps {
  user: PublicUser | null;
  isOffline: boolean;
}

export function HeaderUserMenu({ user, isOffline }: HeaderUserMenuProps) {
  const navigate = useNavigate();
  const submit = useSubmit();

  const handleLogout = () => {
    submit(null, { action: "/auth/logout", method: "post" });
  };

  if (!user) {
    return (
      <Link
        to="/auth/login"
        className="hidden btn btn-primary md:inline-flex"
      >
        Login
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
            disabled={isOffline}
            className={clsx(
              "flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isOffline
                ? "bg-base-200/50 cursor-not-allowed opacity-50"
                : "bg-base-200 hover:bg-base-300"
            )}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-base-content">
              {user.username}
            </span>
            <ChevronDown className="h-4 w-4 text-base-content/60" />
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
