"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "~/utils/tw";

type DatePickerProps = {
  value?: Date;
  onSelect: (date?: Date) => void;
  className?: string;
};

export function DatePicker({ value, onSelect, className }: DatePickerProps) {
  console.log("DatePicker rendered with value:", value);
  return (
    <Popover>
      <input
        type="hidden"
        name="date"
        value={value ? value.toISOString() : ""}
      />

      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP", { locale: de })
          ) : (
            <span>Datum auswählen</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          initialFocus
          locale={de}
        />
      </PopoverContent>
    </Popover>
  );
}
