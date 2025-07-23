import { isFalsy } from "~/utils/falsyUtils";
import { cn } from "~/utils/tw";

export const InfoItem = ({
  icon: Icon,
  label,
  value,
  valueClassName,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined | null;
  valueClassName?: string;
  children?: React.ReactNode;
}) => {
  if (isFalsy(value)) {
    return null; // Do not render if value is falsy
  }
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <p className={cn("font-semibold text-sm text-right", valueClassName)}>
            {value}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};
