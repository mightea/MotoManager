import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

export function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-gray-200 dark:bg-navy-700",
        variant === "circle" ? "rounded-full" : variant === "text" ? "h-4 rounded" : "rounded-xl",
        className
      )}
    />
  );
}

export function MotorcycleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-navy-700">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 px-2 py-4">
            <Skeleton variant="circle" className="h-4 w-4" />
            <Skeleton variant="text" className="w-12" />
            <Skeleton variant="text" className="w-8 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
