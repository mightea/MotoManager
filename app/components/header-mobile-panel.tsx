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
}

/**
 * Mobile slide-out — service-manual TOC style.
 * Each primary nav entry shows a mono code (01 / OVERVIEW) above a display
 * label. The motorsport stripe accents the active item from the left edge.
 */
export function HeaderMobilePanel({
  id,
  isOpen,
  onClose,
  items,
  user,
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
        "absolute left-0 right-0 top-full z-30 overflow-hidden border-t border-base-300 bg-base-100/95 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)] backdrop-blur-md transition-all duration-300 ease-in-out md:hidden",
        isOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0",
      )}
    >
      <div className="p-4">
        <span className="label-tag mb-3">
          <span>Sektionen</span>
        </span>

        <nav>
          <ul className="space-y-1">
            {items.map((item, index) => {
              const isActive = location.pathname === item.href;
              const code = String(index + 1).padStart(2, "0");

              return (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    prefetch="intent"
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "group relative flex items-center gap-3 rounded-sm border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isActive
                        ? "border-base-content/20 bg-base-200 text-base-content dark:bg-navy-800"
                        : "border-transparent text-base-content/65 hover:border-base-content/15 hover:bg-base-200/60 hover:text-base-content dark:hover:bg-navy-800/50",
                    )}
                  >
                    {isActive && (
                      <span aria-hidden="true" className="motorsport-stripe-v absolute inset-y-2 left-0 w-[3px] rounded-r-sm" />
                    )}
                    <span
                      className={clsx(
                        "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums",
                        isActive ? "text-primary" : "text-base-content/40",
                      )}
                    >
                      {code}
                    </span>
                    <span className="h-3 w-px bg-base-content/15" aria-hidden="true" />
                    <span className="font-subdisplay text-base">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {user && (
          <div className="mt-5 border-t border-base-300 pt-4 dark:border-navy-700">
            <div className="mb-3 flex items-center gap-3 px-2">
              <span className="grid h-9 w-9 place-items-center rounded-sm bg-primary/15 font-mono text-sm font-semibold uppercase text-primary dark:bg-primary/25 dark:text-primary-light">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-subdisplay text-sm text-base-content">
                  {user.username}
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
                  {user.role}
                </span>
              </div>
            </div>

            <Link
              to="/settings"
              onClick={onClose}
              className="flex items-center gap-3 rounded-sm px-4 py-3 font-subdisplay text-sm text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-800"
            >
              <Settings className="h-4 w-4" />
              Einstellungen
            </Link>

            {user.role === "admin" && (
              <Link
                to="/settings/admin"
                onClick={onClose}
                className="flex items-center gap-3 rounded-sm px-4 py-3 font-subdisplay text-sm text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-800"
              >
                <Shield className="h-4 w-4" />
                Admin-Bereich
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-sm px-4 py-3 font-subdisplay text-sm text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}

        {!user && (
          <Link
            to="/auth/login"
            onClick={onClose}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)]"
          >
            Login
            <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
          </Link>
        )}
      </div>
    </section>
  );
}
