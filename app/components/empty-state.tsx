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
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-center dark:border-navy-700 dark:bg-navy-800/50",
        size === "md" ? "min-h-[220px] p-10" : "min-h-[160px] p-8",
        className
      )}
    >
      {Icon && (
        <div
          className={clsx(
            "mb-3 grid place-items-center rounded-xl bg-gray-100 dark:bg-navy-700",
            size === "md" ? "h-12 w-12" : "h-10 w-10"
          )}
        >
          <Icon
            className={clsx(
              "text-gray-400 dark:text-navy-300",
              size === "md" ? "h-6 w-6" : "h-5 w-5"
            )}
          />
        </div>
      )}
      <h3
        className={clsx(
          "font-semibold text-foreground dark:text-white",
          size === "md" ? "text-base" : "text-sm"
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-secondary dark:text-navy-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
