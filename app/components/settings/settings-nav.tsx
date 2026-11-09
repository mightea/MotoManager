import { useEffect, useState } from "react";
import clsx from "clsx";
import { useScrollSpy } from "~/hooks/use-scroll-spy";

export type SettingsNavItem = { id: string; label: string };

/**
 * Section navigation for the settings page. A sticky side column from `lg`
 * up; a horizontally scrolling strip above the sections on narrower screens.
 * The entry of the section currently in view is highlighted (scroll-spy).
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  const spied = useScrollSpy(items.map((item) => item.id));
  // A click highlights its entry right away, before the scroll settles.
  const [clicked, setClicked] = useState<string | null>(null);
  const active = clicked ?? spied ?? "";
  useEffect(() => {
    if (!clicked) return;
    const clear = () => setClicked(null);
    window.addEventListener("wheel", clear, { once: true, passive: true });
    window.addEventListener("touchmove", clear, { once: true, passive: true });
    return () => {
      window.removeEventListener("wheel", clear);
      window.removeEventListener("touchmove", clear);
    };
  }, [clicked]);

  return (
    <nav
      aria-label="Abschnitte"
      className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex min-w-max gap-1 rounded-sm border border-base-300/70 bg-base-100 p-1 dark:border-navy-700 dark:bg-navy-800 lg:min-w-0 lg:flex-col lg:gap-0 lg:px-0 lg:py-1.5">
        {items.map((item, i) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setClicked(item.id)}
                aria-current={isActive ? "location" : undefined}
                className={clsx(
                  "flex items-center gap-2.5 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors lg:px-4 lg:py-2.5",
                  isActive
                    ? "bg-base-200/60 text-base-content shadow-[inset_0_-2px_0_0_var(--color-primary)] dark:bg-navy-900 dark:text-white lg:shadow-[inset_3px_0_0_0_var(--color-primary)]"
                    : "text-base-content/70 hover:text-base-content dark:text-navy-300 dark:hover:text-white",
                )}
              >
                <span
                  className={clsx(
                    "font-mono text-[11px] font-semibold tabular-nums",
                    isActive ? "text-primary" : "text-base-content/50 dark:text-navy-500",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
