import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/button";
import type { Issue } from "~/db/schema";
import { Modal } from "~/components/modal";

interface IssueFormProps {
  motorcycleId: number;
  defaultOdo?: number | null;
  initialIssue?: Issue | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const priorityOptions = [
  { value: "high", label: "Hoch" },
  { value: "medium", label: "Mittel" },
  { value: "low", label: "Niedrig" },
];
const statusOptions: { value: Issue["status"]; label: string }[] = [
  { value: "new", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Erledigt" },
];

export function IssueForm({ motorcycleId, defaultOdo, initialIssue, onSuccess, onCancel }: IssueFormProps) {
  const fetcher = useFetcher<{ success?: boolean }>();
  const today = new Date().toISOString().split("T")[0];
  const isSubmitting = fetcher.state !== "idle";
  const hasHandledSuccessRef = useRef(false);
  const intent = initialIssue ? "updateIssue" : "createIssue";
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (fetcher.state === "submitting") {
      hasHandledSuccessRef.current = false;
    }
  }, [fetcher.state]);

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      !hasHandledSuccessRef.current &&
      fetcher.data &&
      typeof fetcher.data === "object" &&
      "success" in fetcher.data &&
      fetcher.data.success
    ) {
      hasHandledSuccessRef.current = true;
      onSuccess();
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleDelete = () => {
    if (!initialIssue) return;
    const formData = new FormData();
    formData.append("intent", "deleteIssue");
    formData.append("issueId", String(initialIssue.id));
    formData.append("motorcycleId", String(motorcycleId));
    fetcher.submit(formData, { method: "post" });
    setConfirmDeleteOpen(false);
  };

  return (
    <fetcher.Form method="post" className="space-y-6">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="motorcycleId" value={motorcycleId} />
      {initialIssue && <input type="hidden" name="issueId" value={initialIssue.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="date"
            className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
          >
            Datum
          </label>
          <input
            type="date"
            name="date"
            id="date"
            defaultValue={initialIssue?.date ?? today}
            className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="odo"
            className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
          >
            Kilometerstand
          </label>
          <input
            type="number"
            name="odo"
            id="odo"
            required
            defaultValue={initialIssue?.odo ?? defaultOdo ?? ""}
            className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="status"
          className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initialIssue?.status ?? "new"}
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="priority"
          className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
        >
          Priorität
        </label>
        <select
          id="priority"
          name="priority"
          defaultValue={initialIssue?.priority ?? "medium"}
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="description"
          className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
        >
          Beschreibung
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Beschreibe den Mangel..."
          defaultValue={initialIssue?.description ?? ""}
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
          required
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {initialIssue && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isSubmitting}
          >
            Löschen
          </Button>
        )}
        <div className="flex flex-1 items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>
      {confirmDeleteOpen && (
        <Modal
          isOpen={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          title="Mangel löschen"
          description="Dieser Mangel wird dauerhaft entfernt. Möchtest du fortfahren?"
        >
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Löschen
            </Button>
          </div>
        </Modal>
      )}
    </fetcher.Form>
  );
}
