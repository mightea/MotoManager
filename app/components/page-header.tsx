import type { ReactNode } from "react";
import clsx from "clsx";

interface PageHeaderProps {
  /** Area the page belongs to, e.g. "Lager", "Flotte", "Archiv". */
  eyebrow: ReactNode;
  /** Page title — rendered in the display face, upper-cased. */
  title: string;
  /** One line of context, e.g. "23 Teile · 34 Stück auf Lager". */
  description?: ReactNode;
  /** Page actions, primary last. Wraps under the title on narrow widths. */
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader — the one header every top-level page uses:
 * eyebrow with a rule, display title, one context line, actions on the right.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={clsx("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 space-y-2">
        <span className="label-tag">
          <span>{eyebrow}</span>
        </span>
        <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-base-content sm:text-5xl dark:text-white">
          {title}
        </h1>
        {description && <p className="text-base-content/70 dark:text-navy-300">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
