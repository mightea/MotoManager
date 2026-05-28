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
