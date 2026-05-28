import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

/**
 * EmptyState — modeled on a blank service-manual page: dashed border on a
 * paper-tinted surface, the title set in the display face, and the action
 * slot rendered prominently below.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "paper relative flex flex-col items-center justify-center rounded-sm border border-dashed border-base-content/20 text-center dark:border-navy-600",
        size === "md" ? "min-h-[220px] px-8 py-10" : "min-h-[160px] px-6 py-8",
        className,
      )}
    >
      {Icon && (
        <div
          className={clsx(
            "mb-3 grid place-items-center rounded-sm border border-base-content/15 bg-base-100/60 text-base-content/40 dark:bg-navy-900/60 dark:text-navy-300",
            size === "md" ? "h-12 w-12" : "h-10 w-10",
          )}
        >
          <Icon className={clsx(size === "md" ? "h-6 w-6" : "h-5 w-5")} />
        </div>
      )}

      <h3
        className={clsx(
          "font-subdisplay text-base-content",
          size === "md" ? "text-lg" : "text-base",
        )}
      >
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-sm font-sans text-sm leading-relaxed text-base-content/60 dark:text-navy-400">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
