import { useEffect, useRef, useState } from "react";
import type { OdometerChange } from "~/types/db";
import { formatNumber } from "~/utils/numberUtils";
import { odometerOffsetAt, toInstrumentReading, todayISO } from "~/utils/odometer";

interface OdometerFieldProps {
  /** Stored total of the record being edited. */
  storedOdo?: number | null;
  /** Date of the record being edited (the offset depends on it). */
  storedDate?: string | null;
  /** Latest known total, used to prefill a new record. */
  defaultOdo?: number | null;
  odometerChanges?: OdometerChange[];
}

const EMPTY_CHANGES: OdometerChange[] = [];

const LABEL_CLASS =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/60 dark:text-navy-400";
const INPUT_CLASS =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

/**
 * The `odo` input of the entry forms. It always holds what the instrument
 * shows; the route action submits it with `odoOffset: 0` and the backend adds
 * the offset of any odometer change in force on the record's date. On a bike
 * with such a change a slim line shows the resulting total.
 *
 * The offset follows the form's `date` field, which this component watches
 * rather than owns, so the forms keep their uncontrolled date inputs.
 */
export function OdometerField({
  storedOdo,
  storedDate,
  defaultOdo,
  odometerChanges = EMPTY_CHANGES,
}: OdometerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<string>(() => storedDate?.slice(0, 10) || todayISO());
  const [reading, setReading] = useState<string>(() => {
    if (typeof storedOdo === "number") {
      return String(Math.max(0, toInstrumentReading(storedOdo, odometerChanges, storedDate)));
    }
    if (typeof defaultOdo === "number") {
      return String(Math.max(0, toInstrumentReading(defaultOdo, odometerChanges, todayISO())));
    }
    return "";
  });

  useEffect(() => {
    const dateInput = inputRef.current?.form?.elements.namedItem("date");
    if (!(dateInput instanceof HTMLInputElement)) return;
    const sync = () => {
      if (dateInput.value) setDate(dateInput.value);
    };
    sync();
    dateInput.addEventListener("input", sync);
    dateInput.addEventListener("change", sync);
    return () => {
      dateInput.removeEventListener("input", sync);
      dateInput.removeEventListener("change", sync);
    };
  }, []);

  const hasChanges = odometerChanges.length > 0;
  const offset = odometerOffsetAt(odometerChanges, date);
  const numericReading = Number(reading);
  const showTotal = offset !== 0 && reading.trim() !== "" && Number.isFinite(numericReading);

  return (
    <div className="space-y-1.5">
      <label htmlFor="odo" className={LABEL_CLASS}>
        {hasChanges ? "Tachostand" : "Kilometerstand"}
      </label>
      <input
        ref={inputRef}
        type="number"
        name="odo"
        id="odo"
        required
        min={0}
        value={reading}
        onChange={(event) => setReading(event.target.value)}
        aria-describedby={showTotal ? "odo-total" : undefined}
        className={INPUT_CLASS}
      />
      {showTotal && (
        <p
          id="odo-total"
          className="flex items-baseline justify-between gap-x-3 whitespace-nowrap border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-base-content/80 dark:text-navy-200"
        >
          <span>
            Gesamt{" "}
            <span className="font-numeric text-[13px] font-bold normal-case tracking-normal text-base-content dark:text-white">
              {formatNumber(numericReading + offset)} km
            </span>
          </span>
          <span aria-label={`Tacho ${offset > 0 ? "plus" : "minus"} ${formatNumber(Math.abs(offset))} Kilometer`}>
            {offset > 0 ? "+" : "−"} {formatNumber(Math.abs(offset))}
          </span>
        </p>
      )}
    </div>
  );
}
