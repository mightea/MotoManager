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
    <div className="card card-bordered border-base-300 bg-base-100 overflow-hidden shadow-sm">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="grid grid-cols-3 divide-x divide-base-300">
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
