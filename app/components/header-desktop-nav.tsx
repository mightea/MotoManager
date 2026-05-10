import { Link, useLocation } from "react-router";
import clsx from "clsx";
import type { NavItem } from "./header-nav-config";

export function HeaderDesktopNav({ items }: { items: NavItem[] }) {
  const location = useLocation();

  return (
    <nav className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full bg-base-200 p-1">
        {items.map((item) => {
          const isActive = location.pathname === item.href;

          return (
            <li key={item.label}>
              <Link
                to={item.href}
                className={clsx(
                  "block rounded-full px-5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary text-primary-content shadow-sm"
                    : "text-base-content/70 hover:text-base-content"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
