import { Link, useLocation, useSubmit } from "react-router";
import { LogOut, Settings, Shield } from "lucide-react";
import clsx from "clsx";
import { type PublicUser } from "~/types/auth";
import type { NavItem } from "./header-nav-config";

interface HeaderMobilePanelProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  user: PublicUser | null;
  isOffline: boolean;
}

export function HeaderMobilePanel({
  id,
  isOpen,
  onClose,
  items,
  user,
  isOffline,
}: HeaderMobilePanelProps) {
  const location = useLocation();
  const submit = useSubmit();

  const handleLogout = () => {
    onClose();
    submit(null, { action: "/auth/logout", method: "post" });
  };

  return (
    <section
      id={id}
      aria-label="Hauptnavigation"
      hidden={!isOpen}
      className={clsx(
        "absolute left-0 right-0 top-full z-30 overflow-hidden rounded-b-2xl border-t border-base-300 bg-base-100/95 shadow-xl backdrop-blur-md transition-all duration-300 ease-in-out md:hidden",
        isOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="p-4">
        <nav className="flex flex-col gap-2">
          {items.map((item) => {
            const isActive = location.pathname === item.href;
            const isDisabled = item.disabled;

            return (
              <Link
                key={item.label}
                to={isDisabled ? "#" : item.href}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                    return;
                  }
                  onClose();
                }}
                aria-disabled={isDisabled || undefined}
                className={clsx(
                  "block rounded-lg px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : isDisabled
                      ? "text-base-content/30 cursor-not-allowed"
                      : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {user && (
            <div
              className={clsx(
                "mt-4 border-t border-base-300 pt-4 transition-opacity",
                isOffline && "opacity-50 pointer-events-none"
              )}
            >
              <div className="mb-4 flex items-center gap-3 px-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-base font-bold text-primary">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-base-content">
                    {user.username}
                  </span>
                  <span className="text-xs text-base-content/60 capitalize">
                    {user.role}
                  </span>
                </div>
              </div>

              <Link
                to="/settings"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Settings className="h-5 w-5" />
                Einstellungen
              </Link>

              {user.role === "admin" && (
                <Link
                  to="/settings/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Shield className="h-5 w-5" />
                  Admin-Bereich
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          )}

          {!user && (
            <Link
              to="/auth/login"
              onClick={onClose}
              className="mt-4 btn btn-primary btn-lg w-full"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </section>
  );
}
