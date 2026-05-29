import { Form, useSubmit } from "react-router";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { Button } from "./button";
import type { PressureUnit, TirePressure } from "~/types/db";
import {
  displayValue,
  formatPressure,
  isPressureOutOfRange,
  toCanonicalBar,
} from "~/utils/pressure";

interface TirePressureFormProps {
  motorcycleId: number;
  initialValues?: TirePressure | null;
  onClose: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
}

/**
 * Form for recording the recommended tire pressures for one motorcycle.
 * Stores values canonically in bar; the unit toggle lets the user enter
 * in psi instead and the converted bar value is sent on save. The
 * preferred unit gets persisted so the form re-opens in the unit the
 * user originally typed.
 */
export function TirePressureForm({
  motorcycleId,
  initialValues,
  onClose,
  onSubmit,
  onDelete,
}: TirePressureFormProps) {
  const submit = useSubmit();

  const [unit, setUnit] = useState<PressureUnit>(
    initialValues?.preferredUnit ?? "bar",
  );
  const [front, setFront] = useState<string>(
    initialValues ? displayValue(initialValues.frontBar, initialValues.preferredUnit) : "",
  );
  const [rear, setRear] = useState<string>(
    initialValues ? displayValue(initialValues.rearBar, initialValues.preferredUnit) : "",
  );
  const [hasSidecar, setHasSidecar] = useState<boolean>(
    initialValues?.sidecarBar != null,
  );
  const [sidecar, setSidecar] = useState<string>(
    initialValues?.sidecarBar != null
      ? displayValue(initialValues.sidecarBar, initialValues.preferredUnit)
      : "",
  );

  /**
   * Toggle the input unit without losing values: convert the existing
   * strings from the old unit to the new unit so the canonical bar
   * value stays the same.
   */
  const handleUnitChange = (next: PressureUnit) => {
    if (next === unit) return;
    const convert = (v: string): string => {
      if (v.trim() === "") return v;
      const bar = toCanonicalBar(v, unit);
      if (bar == null) return v;
      return displayValue(bar, next);
    };
    setFront(convert(front));
    setRear(convert(rear));
    setSidecar(convert(sidecar));
    setUnit(next);
  };

  const frontBar = useMemo(() => toCanonicalBar(front, unit), [front, unit]);
  const rearBar = useMemo(() => toCanonicalBar(rear, unit), [rear, unit]);
  const sidecarBar = useMemo(
    () => (hasSidecar ? toCanonicalBar(sidecar, unit) : null),
    [hasSidecar, sidecar, unit],
  );

  const formValid =
    frontBar != null &&
    rearBar != null &&
    (!hasSidecar || sidecarBar != null);

  const frontWarn = frontBar != null && isPressureOutOfRange(frontBar);
  const rearWarn = rearBar != null && isPressureOutOfRange(rearBar);
  const sidecarWarn = sidecarBar != null && isPressureOutOfRange(sidecarBar);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValid) return;
    const fd = new FormData();
    fd.set("intent", "upsertTirePressure");
    fd.set("motorcycleId", String(motorcycleId));
    fd.set("frontBar", String(frontBar));
    fd.set("rearBar", String(rearBar));
    fd.set("preferredUnit", unit);
    if (sidecarBar != null) {
      fd.set("sidecarBar", String(sidecarBar));
    }
    submit(fd, { method: "post" });
    onSubmit?.();
  };

  const handleDelete = () => {
    if (!initialValues) return;
    const fd = new FormData();
    fd.set("intent", "deleteTirePressure");
    fd.set("motorcycleId", String(motorcycleId));
    submit(fd, { method: "post" });
    onDelete?.();
  };

  return (
    <Form method="post" className="space-y-5" onSubmit={handleSubmit}>
      {/* Unit toggle — segmented control with aria-pressed for state. */}
      <fieldset className="space-y-1.5">
        <legend className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Einheit
        </legend>
        <div className="inline-flex rounded-sm border border-base-300 bg-base-100 p-0.5 dark:border-navy-700 dark:bg-navy-900">
          {(["bar", "psi"] as PressureUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              aria-label={`Einheit ${u}`}
              onClick={() => handleUnitChange(u)}
              className={clsx(
                "rounded-sm px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                unit === u
                  ? "bg-primary text-primary-content"
                  : "text-base-content/65 hover:bg-base-200 dark:text-navy-300 dark:hover:bg-navy-800",
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </fieldset>

      <PressureField
        id="front"
        label="Vorderreifen"
        value={front}
        onChange={setFront}
        unit={unit}
        warn={frontWarn}
        required
      />
      <PressureField
        id="rear"
        label="Hinterreifen"
        value={rear}
        onChange={setRear}
        unit={unit}
        warn={rearWarn}
        required
      />

      <div className="space-y-2">
        <label className="inline-flex items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={hasSidecar}
            onChange={(e) => setHasSidecar(e.target.checked)}
            className="h-4 w-4 rounded-sm border-base-300 text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-600"
          />
          <span className="text-sm text-base-content dark:text-gray-100">
            Reifendruck Beiwagen erfassen
          </span>
        </label>
        {hasSidecar && (
          <PressureField
            id="sidecar"
            label="Beiwagenreifen"
            value={sidecar}
            onChange={setSidecar}
            unit={unit}
            warn={sidecarWarn}
            required
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-4 dark:border-navy-700">
        {initialValues && onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Löschen
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!formValid}>
            Speichern
          </Button>
        </div>
      </div>
    </Form>
  );
}

function PressureField({
  id,
  label,
  value,
  onChange,
  unit,
  warn,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: PressureUnit;
  warn: boolean;
  required: boolean;
}) {
  // Convert the current input value to its converted-unit twin for the
  // helper line below the field.
  const bar = toCanonicalBar(value, unit);
  const helper = bar != null ? formatPressure(bar, unit) : null;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-32 rounded-sm border border-base-300 bg-base-100 px-3 py-2 font-numeric text-base font-semibold tabular-nums text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
        />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
          {unit}
        </span>
      </div>
      <p className={clsx(
        "font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
        warn ? "text-[var(--color-workshop)]" : "text-base-content/50",
      )}>
        {helper ? (
          <>
            ≈ {helper.secondary}
            {warn && <span className="ml-2 normal-case tracking-normal">· Ungewöhnlicher Wert prüfen</span>}
          </>
        ) : (
          "—"
        )}
      </p>
    </div>
  );
}
