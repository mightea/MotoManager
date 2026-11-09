import { Link } from "react-router";
import clsx from "clsx";
import { useScrollSpy } from "~/hooks/use-scroll-spy";

export interface AdminSection {
  /** Anchor id of the section on the page, or a route for external entries. */
  id: string;
  label: string;
  count?: string;
  to?: string;
}

/**
 * Left-hand section menu of the admin page. Sticky beside the content on
 * desktop, a horizontally scrolling strip on phones. Highlights the section
 * currently in view.
 */
export function AdminSectionNav({ sections }: { sections: AdminSection[] }) {
  const active = useScrollSpy(sections.filter((s) => !s.to).map((s) => s.id));

  return (
    <nav
      aria-label="Admin-Bereiche"
      className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ol className="flex w-max gap-1.5 lg:w-auto lg:flex-col lg:gap-0 lg:rounded-sm lg:border lg:border-base-300/70 lg:bg-base-100 lg:dark:border-navy-700 lg:dark:bg-navy-800">
        {sections.map((s, index) => {
          const isActive = !s.to && active === s.id;
          const className = clsx(
            "flex items-center justify-between gap-3 whitespace-nowrap rounded-sm border px-3 py-2 text-sm font-semibold transition-colors",
            "lg:rounded-none lg:border-0 lg:border-t lg:border-base-200 lg:px-3.5 lg:py-[11px] lg:first:border-t-0 lg:dark:border-navy-700",
            isActive
              ? "border-primary bg-base-100 text-base-content shadow-[inset_3px_0_0_var(--color-primary)] dark:bg-navy-800 dark:text-white lg:bg-base-200 lg:dark:bg-navy-900"
              : "border-base-300/70 bg-base-100 text-base-content/70 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white lg:bg-transparent lg:dark:bg-transparent",
          );
          const body = (
            <>
              <span className="flex items-baseline gap-2.5">
                <span className="font-mono text-[11px] font-semibold text-base-content/50 dark:text-navy-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{s.label}</span>
              </span>
              {s.count && (
                <span className="font-mono text-xs font-normal text-base-content/70 dark:text-navy-400">{s.count}</span>
              )}
            </>
          );
          return (
            <li key={s.id}>
              {s.to ? (
                <Link to={s.to} className={className}>
                  {body}
                </Link>
              ) : (
                <a href={`#${s.id}`} aria-current={isActive ? "location" : undefined} className={className}>
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
