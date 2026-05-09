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

export function DocumentCardSkeleton() {
  return (
    <div className="card card-bordered border-base-300 bg-base-100 p-4 shadow-sm flex flex-col gap-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2 h-3" />
    </div>
  );
}

export function ExpenseRowSkeleton() {
  return (
    <div className="card card-bordered border-base-200 bg-base-100 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton variant="text" className="w-24 h-3" />
          </div>
          <Skeleton variant="text" className="w-32 h-5" />
          <Skeleton variant="text" className="w-3/4 h-3" />
        </div>
        <Skeleton variant="circle" className="h-8 w-8" />
      </div>
    </div>
  );
}

export function StatRowSkeleton() {
  return (
    <div className="card card-bordered border-base-200 bg-base-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" className="w-24 h-6" />
        <Skeleton variant="text" className="w-16 h-4" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton variant="text" className="w-16 h-3" />
            <Skeleton variant="text" className="w-20 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MotorcycleDetailSkeleton() {
  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-48 h-6" />
          <Skeleton variant="text" className="w-32 h-3" />
        </div>
      </div>
      <Skeleton className="h-56 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
