import { cn } from "~/utils/tw";

interface MotorcycleSelectLabelProps {
  make: string;
  model: string;
  modelYear?: number | null;
  ownerUsername?: string | null;
  className?: string;
}

export function MotorcycleSelectLabel({
  make,
  model,
  modelYear,
  ownerUsername,
  className,
}: MotorcycleSelectLabelProps) {
  const primaryParts = [make, model];
  if (modelYear != null) {
    primaryParts.push(`(${modelYear})`);
  }

  const owner = ownerUsername?.trim();

  return (
    <span className={cn("flex flex-row truncate gap-2", className)}>
      <span className="truncate text-sm text-muted-foreground">{make}</span>
      <span className="truncate font-medium text-foreground">{model}</span>
      {owner ? (
        <span className="truncate text-sm text-muted-foreground capitalize">
          ({owner})
        </span>
      ) : null}
    </span>
  );
}
