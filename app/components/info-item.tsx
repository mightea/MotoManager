import type { ElementType, ReactNode } from "react";
import { cn } from "~/utils/tw";

type InfoItemValue = string | number | undefined | null;

const isEmptyValue = (value: InfoItemValue) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
};

export const InfoItem = ({
  icon: Icon,
  label,
  value,
  valueClassName,
  children,
}: {
  icon: ElementType;
  label: string;
  value: InfoItemValue;
  valueClassName?: string;
  children?: ReactNode;
}) => {
  if (isEmptyValue(value)) {
    return null;
  }
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className={cn("font-semibold text-sm text-right", valueClassName)}>
          {value}
        </p>
        {children}
      </div>
    </div>
  );
};
