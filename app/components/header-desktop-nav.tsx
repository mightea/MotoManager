import { Link, useLocation } from "react-router";
import clsx from "clsx";
import type { NavItem } from "./header-nav-config";

/**
 * Desktop nav — a tabular row of display-cased section labels. The active
 * item is anchored by the motorsport stripe drawn just under the label.
 */
export function HeaderDesktopNav({ items }: { items: NavItem[] }) {
  const location = useLocation();

  return (
    <nav className="hidden md:block" aria-label="Hauptnavigation">
      <ul className="flex items-stretch gap-1">
        {items.map((item) => {
          const isActive = location.pathname === item.href;

          return (
            <li key={item.label} className="flex">
              <Link
                to={item.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "group relative flex items-center justify-center px-3 pb-2 pt-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
                  isActive
                    ? "text-base-content"
                    : "text-base-content/55 hover:text-base-content",
                )}
              >
                <span className="font-subdisplay text-sm leading-none">
                  {item.label}
                </span>
                {/* Active marker — the motorsport stripe ribbon */}
                <span
                  aria-hidden="true"
                  className={clsx(
                    "motorsport-stripe absolute inset-x-2 bottom-0 h-[3px] origin-left transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
