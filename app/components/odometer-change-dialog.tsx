import { useState } from "react";
import { Form } from "react-router";
import { Button } from "./button";
import { Modal } from "./modal";
import type { MaintenanceRecord, OdometerChange, OdometerChangeKind } from "~/types/db";
import { formatNumber } from "~/utils/numberUtils";
import { todayISO } from "~/utils/odometer";

interface OdometerChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  /** The change being edited; null/undefined records a new one. */
  initialData?: OdometerChange | null;
  /** History of the bike, for the "entries that will be raised" preview. */
  records?: MaintenanceRecord[];
  onDelete?: () => void;
  onSubmit?: () => void;
}

const EMPTY_RECORDS: MaintenanceRecord[] = [];

const LABEL_CLASS =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/60 dark:text-navy-400";
const INPUT_CLASS =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]";

/** Records a replaced or rolled-over odometer (see `~/utils/odometer`). */
export function OdometerChangeDialog({
  isOpen,
  onClose,
  motorcycleId,
  initialData,
  records = EMPTY_RECORDS,
  onDelete,
  onSubmit,
}: OdometerChangeDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Tachowechsel bearbeiten" : "Tachowechsel erfassen"}
      description="Der Tacho wurde ersetzt oder ist übergelaufen. Du gibst weiter ein, was er zeigt; angezeigt wird der Gesamtstand."
    >
      <OdometerChangeForm
        key={isOpen ? `open-${initialData?.id ?? "new"}` : "closed"}
        motorcycleId={motorcycleId}
        initialData={initialData}
        records={records}
        onCancel={onClose}
        onDelete={onDelete}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

function OdometerChangeForm({
  motorcycleId,
  initialData,
  records,
  onCancel,
  onDelete,
  onSubmit,
}: {
  motorcycleId: number;
  initialData?: OdometerChange | null;
  records: MaintenanceRecord[];
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit?: () => void;
}) {
  const [kind, setKind] = useState<OdometerChangeKind>(initialData?.kind ?? "replacement");
  const [date, setDate] = useState<string>(initialData?.date.slice(0, 10) ?? todayISO());
  const [readingBefore, setReadingBefore] = useState<string>(
    initialData ? String(initialData.readingBefore) : "",
  );
  const [readingAfter, setReadingAfter] = useState<string>(initialData ? String(initialData.readingAfter) : "0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const before = Number(readingBefore);
  const after = Number(readingAfter);
  const complete =
    date !== "" &&
    readingBefore.trim() !== "" &&
    readingAfter.trim() !== "" &&
    Number.isInteger(before) &&
    Number.isInteger(after) &&
    before >= 0 &&
    after >= 0;
  const offset = complete ? before - after : null;

  // Only a new change re-bases entries that still hold instrument readings;
  // for an existing one they have been raised already.
  const affected = initialData ? [] : records.filter((record) => date !== "" && record.date.slice(0, 10) >= date);
  const examples = [...affected].sort((a, b) => b.date.localeCompare(a.date) || b.odo - a.odo).slice(0, 3);

  return (
    <Form
      method="post"
      className="space-y-5"
      onSubmit={(event) => {
        if (!complete) {
          event.preventDefault();
          return;
        }
        setIsSubmitting(true);
        onSubmit?.();
      }}
    >
      <input type="hidden" name="intent" value={initialData ? "updateOdometerChange" : "createOdometerChange"} />
      <input type="hidden" name="motorcycleId" value={motorcycleId} />
      {initialData && <input type="hidden" name="changeId" value={initialData.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="odometer-change-kind" className={LABEL_CLASS}>Art</label>
          <select
            id="odometer-change-kind"
            name="kind"
            value={kind}
            onChange={(event) => {
              const next = event.target.value as OdometerChangeKind;
              setKind(next);
              // A five-digit counter rolls over from 99'999 to 0.
              if (next === "rollover" && readingBefore.trim() === "") {
                setReadingBefore("99999");
                setReadingAfter("0");
              }
            }}
            className={INPUT_CLASS}
          >
            <option value="replacement">Tacho ersetzt</option>
            <option value="rollover">Überlauf (99’999 → 0)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="odometer-change-date" className={LABEL_CLASS}>Datum</label>
          <input
            type="date"
            id="odometer-change-date"
            name="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="odometer-change-before" className={LABEL_CLASS}>Alter Tacho zeigte</label>
          <input
            type="number"
            id="odometer-change-before"
            name="readingBefore"
            required
            min={0}
            step={1}
            value={readingBefore}
            onChange={(event) => setReadingBefore(event.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="odometer-change-after" className={LABEL_CLASS}>Neuer Tacho zeigte</label>
          <input
            type="number"
            id="odometer-change-after"
            name="readingAfter"
            required
            min={0}
            step={1}
            value={readingAfter}
            onChange={(event) => setReadingAfter(event.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <p className="-mt-2 text-[13px] text-base-content/70 dark:text-navy-300">
        Alten Stand nicht bekannt? Schätzen, er lässt sich später korrigieren.
      </p>

      {offset !== null && (
        <dl className="grid grid-cols-2 border border-primary/30 bg-primary/10">
          <div className="border-r border-primary/30 px-3 py-2.5">
            <dt className={LABEL_CLASS}>Versatz</dt>
            <dd className="font-numeric text-base font-bold text-base-content dark:text-white">
              {offset >= 0 ? "+" : "−"} {formatNumber(Math.abs(offset))} km
            </dd>
          </div>
          <div className="px-3 py-2.5">
            <dt className={LABEL_CLASS}>Gesamtstand beim Wechsel</dt>
            <dd className="font-numeric text-base font-bold text-base-content dark:text-white">
              {formatNumber(before)} km
            </dd>
          </div>
        </dl>
      )}

      {offset !== null && offset !== 0 && affected.length > 0 && (
        <div className="border border-base-300 dark:border-navy-700">
          <div className="border-b border-base-300 px-3 py-2.5 dark:border-navy-700">
            <p className="text-sm font-semibold text-base-content dark:text-white">
              {affected.length} {affected.length === 1 ? "Eintrag" : "Einträge"} seit dem Wechsel{" "}
              {affected.length === 1 ? "wird" : "werden"} {offset > 0 ? "angehoben" : "gesenkt"}
            </p>
            <p className="text-[13px] text-base-content/70 dark:text-navy-300">
              Sie wurden mit dem neuen Tachostand erfasst. Einträge davor bleiben unverändert.
            </p>
          </div>
          <ul className="px-3 py-2.5 font-mono text-[13px] text-base-content/80 dark:text-navy-200">
            {examples.map((record) => (
              <li key={record.id} className="flex justify-between gap-3">
                <span>{record.date.slice(0, 10)}</span>
                <span>
                  {formatNumber(record.odo)} →{" "}
                  <span className="font-bold text-base-content dark:text-white">{formatNumber(record.odo + offset)}</span>
                </span>
              </li>
            ))}
            {affected.length > examples.length && <li>… {affected.length - examples.length} weitere</li>}
          </ul>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {initialData && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isSubmitting}
            className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 sm:mr-auto sm:w-auto"
          >
            Löschen
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">
          Abbrechen
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!complete} className="w-full sm:w-auto">
          Speichern
        </Button>
      </div>
    </Form>
  );
}
