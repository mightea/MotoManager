import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

export function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton",
        variant === "circle"
          ? "rounded-full"
          : variant === "text"
            ? "h-4 rounded"
            : "rounded-box",
        className
      )}
    />
  );
}

/**
 * Full-page placeholder for the motorcycle detail routes, shown via
 * HydrateFallback on hard reloads / deep links while the loader runs.
 * Mirrors the detail layout: header band with telemetry strip, then a
 * two-column card grid with history rows.
 */
export function MotorcycleDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true">
      {/* Header band */}
      <div className="overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] dark:bg-navy-800">
        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-7 rounded-none" />
            <Skeleton variant="text" className="h-2.5 w-20" />
          </div>
          <Skeleton variant="text" className="h-8 w-64 max-w-full" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant="text" className="h-2 w-12" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 rounded-sm border border-base-300 bg-base-100 px-4 py-4 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] dark:bg-navy-800">
            <Skeleton variant="text" className="h-4 w-40" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="h-3 w-1/2" />
                  <Skeleton variant="text" className="h-2 w-1/3" />
                </div>
                <Skeleton variant="text" className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-3 rounded-sm border border-base-300 bg-base-100 px-4 py-4 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] dark:bg-navy-800">
            <Skeleton variant="text" className="h-4 w-32" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton variant="text" className="h-3 w-24" />
                <Skeleton variant="text" className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-sm border border-base-300 bg-base-100 px-4 py-4 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] dark:bg-navy-800">
            <Skeleton variant="text" className="h-4 w-28" />
            <Skeleton variant="text" className="h-3 w-full" />
            <Skeleton variant="text" className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-page placeholder for the garage (home) route: a stats band and a grid of
 * motorcycle-card skeletons. Shown via HydrateFallback on a hard reload of `/`.
 */
export function HomeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <Skeleton className="mb-6 h-20 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <MotorcycleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Generic page placeholder for content routes (documents, stats, settings, …)
 * shown via HydrateFallback on hard reload — avoids the bare-spinner flash.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Skeleton variant="text" className="mb-2 h-7 w-48" />
      <Skeleton variant="text" className="mb-6 h-4 w-72" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function MotorcycleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] dark:bg-navy-800">
      <div className="flex min-h-9 items-center justify-between border-b border-base-200 px-3 dark:border-navy-700">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-7 rounded-none" />
          <Skeleton variant="text" className="w-16 h-2.5" />
        </div>
      </div>
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="grid grid-cols-[8px_1fr_1fr_1fr] items-stretch">
        <div aria-hidden className="bg-base-200 dark:bg-navy-700" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 border-l border-base-200 px-2.5 py-3 first:border-l-0 dark:border-navy-700">
            <Skeleton variant="text" className="w-14 h-3" />
            <Skeleton variant="text" className="w-10 h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
