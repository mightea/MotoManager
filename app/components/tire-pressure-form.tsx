import { Form, useNavigation, useSubmit } from "react-router";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { Button } from "./button";
import { FormField } from "./form-field";
import type { PressureUnit, TirePressure } from "~/types/db";
import {
  displayValue,
  formatPressure,
  isPressureOutOfRange,
  toCanonicalBar,
} from "~/utils/pressure";

interface TirePressureFormProps {
  motorcycleId: number;
  /**
   * Whether the motorcycle is a sidecar rig — gates the sidecar-wheel
   * field. When false, stored sidecar values are dropped on the next save.
   */
  hasSidecar?: boolean;
  initialValues?: TirePressure | null;
  onClose: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
}

/** The riding configurations a pressure set can be recorded for. */
type PressureConfig = "solo" | "passenger" | "offroad";

const CONFIGS: PressureConfig[] = ["solo", "passenger", "offroad"];

const CONFIG_LABELS: Record<PressureConfig, string> = {
  solo: "Solo",
  passenger: "Mit Sozius",
  offroad: "Offroad",
};

/** Front / rear / sidecar input strings of one configuration. */
type ConfigValues = { front: string; rear: string; sidecar: string };

type ConfigState = "empty" | "complete" | "incomplete";

/**
 * Form for recording the recommended tire pressures for one motorcycle.
 * A configuration select switches between the riding configurations
 * (Solo, Mit Sozius, Offroad); each shows front, rear, and an optional
 * sidecar-wheel field — the sidecar is a tire position inside every
 * configuration, not a configuration of its own. Values entered for one
 * configuration are kept while another is shown, and everything filled
 * in is saved together; every configuration is optional, but at least
 * one must be recorded. Deleting removes only the selected configuration
 * — deleting the last one removes the record. Stores values canonically
 * in bar; the unit toggle lets
 * the user enter psi instead. The preferred unit gets persisted so the
 * form re-opens in the unit the user originally typed.
 */
export function TirePressureForm({
  motorcycleId,
  hasSidecar = false,
  initialValues,
  onClose,
  onSubmit,
  onDelete,
}: TirePressureFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "upsertTirePressure";

  const initialDisplay = (bar: number | null | undefined): string =>
    initialValues && bar != null ? displayValue(bar, initialValues.preferredUnit) : "";

  // Without a sidecar the field never renders and its stored values are not
  // loaded into state, so the next save clears them.
  const initialSidecar = (bar: number | null | undefined): string =>
    hasSidecar ? initialDisplay(bar) : "";

  const [unit, setUnit] = useState<PressureUnit>(
    initialValues?.preferredUnit ?? "bar",
  );
  const [config, setConfig] = useState<PressureConfig>("solo");
  const [values, setValues] = useState<Record<PressureConfig, ConfigValues>>({
    solo: {
      front: initialDisplay(initialValues?.frontBar),
      rear: initialDisplay(initialValues?.rearBar),
      sidecar: initialSidecar(initialValues?.sidecarBar),
    },
    passenger: {
      front: initialDisplay(initialValues?.frontPassengerBar),
      rear: initialDisplay(initialValues?.rearPassengerBar),
      sidecar: initialSidecar(initialValues?.sidecarPassengerBar),
    },
    offroad: {
      front: initialDisplay(initialValues?.frontOffroadBar),
      rear: initialDisplay(initialValues?.rearOffroadBar),
      sidecar: initialSidecar(initialValues?.sidecarOffroadBar),
    },
  });

  const setField = (cfg: PressureConfig, field: keyof ConfigValues, value: string) =>
    setValues((prev) => ({ ...prev, [cfg]: { ...prev[cfg], [field]: value } }));

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
    setValues((prev) => {
      const converted = {} as Record<PressureConfig, ConfigValues>;
      for (const cfg of CONFIGS) {
        converted[cfg] = {
          front: convert(prev[cfg].front),
          rear: convert(prev[cfg].rear),
          sidecar: convert(prev[cfg].sidecar),
        };
      }
      return converted;
    });
    setUnit(next);
  };

  /** Parsed bar values per configuration (null = empty or unparseable). */
  const parsed = useMemo(() => {
    const result = {} as Record<PressureConfig, { front: number | null; rear: number | null; sidecar: number | null }>;
    for (const cfg of CONFIGS) {
      result[cfg] = {
        front: toCanonicalBar(values[cfg].front, unit),
        rear: toCanonicalBar(values[cfg].rear, unit),
        sidecar: toCanonicalBar(values[cfg].sidecar, unit),
      };
    }
    return result;
  }, [values, unit]);

  const isEmpty = (v: string) => v.trim() === "";

  /**
   * A configuration is complete when front and rear parse and the sidecar
   * field is empty or parses; empty when all three fields are empty. A
   * half-filled or unparseable set is incomplete and blocks saving.
   */
  const configState = (cfg: PressureConfig): ConfigState => {
    const v = values[cfg];
    const p = parsed[cfg];
    if (isEmpty(v.front) && isEmpty(v.rear) && isEmpty(v.sidecar)) return "empty";
    const sidecarOk = isEmpty(v.sidecar) || p.sidecar != null;
    return p.front != null && p.rear != null && sidecarOk ? "complete" : "incomplete";
  };

  const configStates = {
    solo: configState("solo"),
    passenger: configState("passenger"),
    offroad: configState("offroad"),
  } as const;

  // Saving needs every configuration well-formed and at least one recorded —
  // an entirely empty record is a delete, not a save.
  const formValid =
    Object.values(configStates).every((s) => s !== "incomplete") &&
    Object.values(configStates).some((s) => s === "complete");

  const configOption = (key: PressureConfig): string => {
    const state = configStates[key];
    if (state === "complete") return `${CONFIG_LABELS[key]} ✓`;
    if (state === "incomplete") return `${CONFIG_LABELS[key]} · unvollständig`;
    return CONFIG_LABELS[key];
  };

  const warn = (bar: number | null) => bar != null && isPressureOutOfRange(bar);

  /**
   * Serialize every complete configuration into an upsert payload —
   * `omit` drops one configuration, which is how a single set gets
   * deleted (the backend clears columns absent from the payload).
   */
  const buildUpsertData = (omit?: PressureConfig): FormData => {
    const fd = new FormData();
    fd.set("intent", "upsertTirePressure");
    fd.set("motorcycleId", String(motorcycleId));
    fd.set("preferredUnit", unit);
    if (omit !== "solo" && configStates.solo === "complete") {
      fd.set("frontBar", String(parsed.solo.front));
      fd.set("rearBar", String(parsed.solo.rear));
      if (parsed.solo.sidecar != null) fd.set("sidecarBar", String(parsed.solo.sidecar));
    }
    if (omit !== "passenger" && configStates.passenger === "complete") {
      fd.set("frontPassengerBar", String(parsed.passenger.front));
      fd.set("rearPassengerBar", String(parsed.passenger.rear));
      if (parsed.passenger.sidecar != null) {
        fd.set("sidecarPassengerBar", String(parsed.passenger.sidecar));
      }
    }
    if (omit !== "offroad" && configStates.offroad === "complete") {
      fd.set("frontOffroadBar", String(parsed.offroad.front));
      fd.set("rearOffroadBar", String(parsed.offroad.rear));
      if (parsed.offroad.sidecar != null) {
        fd.set("sidecarOffroadBar", String(parsed.offroad.sidecar));
      }
    }
    return fd;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValid) return;
    submit(buildUpsertData(), { method: "post" });
    onSubmit?.();
  };

  // Deleting the selected configuration re-saves the record without it —
  // unless it is the last one holding values, which deletes the record.
  const deleteRemovesRecord = CONFIGS.every(
    (c) => c === config || configStates[c] !== "complete",
  );

  /** Delete only the selected configuration. */
  const handleDelete = () => {
    if (deleteRemovesRecord) {
      const fd = new FormData();
      fd.set("intent", "deleteTirePressure");
      fd.set("motorcycleId", String(motorcycleId));
      submit(fd, { method: "post" });
      onDelete?.();
      return;
    }
    setValues((prev) => ({ ...prev, [config]: { front: "", rear: "", sidecar: "" } }));
    submit(buildUpsertData(config), { method: "post" });
    onSubmit?.();
  };

  // Deletable only when the selected configuration holds values, and the
  // remaining configurations are well-formed (they get re-saved as-is).
  const canDelete =
    initialValues != null &&
    configStates[config] !== "empty" &&
    CONFIGS.every((c) => c === config || configStates[c] !== "incomplete");

  const current = values[config];
  const currentParsed = parsed[config];

  return (
    <Form method="post" className="space-y-5" onSubmit={handleSubmit}>
      {/* Unit toggle — daisyUI join as a segmented control. */}
      <fieldset className="space-y-1.5">
        <legend className="block text-xs font-semibold uppercase tracking-wider text-base-content/60">
          Einheit
        </legend>
        <div className="join">
          {(["bar", "psi"] as PressureUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              aria-label={`Einheit ${u}`}
              onClick={() => handleUnitChange(u)}
              className={clsx(
                "btn btn-sm join-item font-mono uppercase tracking-[0.14em]",
                unit === u ? "btn-primary" : "btn-ghost border-base-300 dark:border-navy-700",
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </fieldset>

      <FormField
        as="select"
        label="Konfiguration"
        value={config}
        onChange={(e) => setConfig(e.target.value as PressureConfig)}
        helperText="Mindestens eine Konfiguration mit Vorder- und Hinterreifen erfassen — Felder leer lassen, um eine zu entfernen."
      >
        {CONFIGS.map((key) => (
          <option key={key} value={key}>
            {configOption(key)}
          </option>
        ))}
      </FormField>

      <PressureField
        id={`front-${config}`}
        label="Vorderreifen"
        value={current.front}
        onChange={(v) => setField(config, "front", v)}
        unit={unit}
        warn={warn(currentParsed.front)}
      />
      <PressureField
        id={`rear-${config}`}
        label="Hinterreifen"
        value={current.rear}
        onChange={(v) => setField(config, "rear", v)}
        unit={unit}
        warn={warn(currentParsed.rear)}
      />
      {hasSidecar && (
        <PressureField
          id={`sidecar-${config}`}
          label="Beiwagenreifen"
          value={current.sidecar}
          onChange={(v) => setField(config, "sidecar", v)}
          unit={unit}
          warn={warn(currentParsed.sidecar)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-4 dark:border-navy-700">
        {canDelete && onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            {deleteRemovesRecord ? "Eintrag löschen" : `${CONFIG_LABELS[config]} löschen`}
          </button>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!formValid} isLoading={isSubmitting}>
            Speichern
          </Button>
        </div>
      </div>
    </Form>
  );
}

/**
 * Pressure input — daisyUI input styled like FormField, plus the unit
 * suffix and a helper line showing the converted-unit twin (with a soft
 * out-of-range warning).
 */
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
  required?: boolean;
}) {
  const bar = toCanonicalBar(value, unit);
  const helper = bar != null ? formatPressure(bar, unit) : null;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-base-content/60"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-error">
            *
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={unit === "psi" ? "1" : "0.1"}
          min="0"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(
            "input input-bordered w-32 bg-base-200 font-numeric font-semibold tabular-nums text-base-content",
            warn && "input-warning",
          )}
        />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
          {unit}
        </span>
      </div>
      <p
        className={clsx(
          "text-xs",
          warn ? "font-medium text-[var(--color-workshop)]" : "text-base-content/60",
        )}
      >
        {helper ? (
          <>
            ≈ {helper.secondary}
            {warn && <span className="ml-2">· Ungewöhnlicher Wert prüfen</span>}
          </>
        ) : (
          "—"
        )}
      </p>
    </div>
  );
}
