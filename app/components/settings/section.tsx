import type { ReactNode } from "react";
import clsx from "clsx";
import { Card } from "~/components/card";

/** Mono micro label used for table heads, field labels and sub-headings. */
export const MICRO_LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400";

/** Text input in the settings boards: 40px, hairline border, sharp corners. */
export const SETTINGS_INPUT =
  "block h-10 w-full rounded-sm border border-base-300 bg-base-100 px-2.5 text-[15px] text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

/** Compact numeric input used inside the interval table. */
export const SETTINGS_NUMBER_INPUT =
  "block h-9 w-full rounded-sm border border-base-300 bg-base-100 px-2.5 font-numeric text-[15px] text-base-content placeholder:text-base-content/40 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder:text-navy-500";

/**
 * One settings section: a Card whose head carries the upper-case title, an
 * optional one-line description and an optional trailing slot.
 */
export function SettingsSection({
  id,
  title,
  description,
  trailing,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-h`;
  return (
    <section id={id} aria-labelledby={headingId} className={clsx("scroll-mt-24", className)}>
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-base-200 px-4 py-3.5 dark:border-navy-700">
          <div className="min-w-0">
            <h2
              id={headingId}
              className="font-subdisplay text-[15px] leading-tight tracking-[0.06em] text-base-content dark:text-white"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-base-content/70 dark:text-navy-300">{description}</p>
            )}
          </div>
          {trailing}
        </div>
        {children}
      </Card>
    </section>
  );
}
