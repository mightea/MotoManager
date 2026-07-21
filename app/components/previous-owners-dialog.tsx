import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Pencil, Plus } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import type { PreviousOwner } from "~/types/db";
import { movePreviousOwner } from "~/utils/previous-owner-order";

interface PreviousOwnersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  owners: PreviousOwner[];
  hasUnknownOwners: boolean;
  onAddOwner: () => void;
  onEditOwner: (owner: PreviousOwner) => void;
}

interface ReorderResponse {
  success: boolean;
  intent: string;
  error?: string;
}

/**
 * Manage the full previous-owner chain for a motorcycle: the "history
 * incomplete" toggle plus the list of recorded owners with add/edit entry
 * points. Opened from the motorcycle edit form; each owner is added/edited via
 * the single-owner {@link PreviousOwnerDialog}, which the route stacks on top.
 *
 * The toggle persists on its own via a fetcher (intent `setPreviousOwnersUnknown`)
 * — it doesn't share the main edit form's Save, mirroring how owner CRUD already
 * writes immediately.
 */
export function PreviousOwnersDialog({
  isOpen,
  onClose,
  motorcycleId,
  owners,
  hasUnknownOwners,
  onAddOwner,
  onEditOwner,
}: PreviousOwnersDialogProps) {
  const toggleFetcher = useFetcher();
  const orderFetcher = useFetcher<ReorderResponse>();
  const [orderedOwners, setOrderedOwners] = useState(owners);
  const [orderError, setOrderError] = useState<string | null>(null);
  const draggedOwnerId = useRef<number | null>(null);

  useEffect(() => {
    setOrderedOwners(owners);
  }, [owners]);

  useEffect(() => {
    if (
      orderFetcher.state === "idle"
      && orderFetcher.data?.intent === "reorderPreviousOwners"
    ) {
      if (orderFetcher.data.success) {
        setOrderError(null);
      } else {
        setOrderedOwners(owners);
        setOrderError(orderFetcher.data.error ?? "Reihenfolge konnte nicht gespeichert werden.");
      }
    }
  }, [orderFetcher.data, orderFetcher.state, owners]);

  const isSavingOrder = orderFetcher.state !== "idle";

  // Optimistic: reflect the in-flight toggle immediately, fall back to the
  // persisted value once the submission settles and the route revalidates.
  const pendingValue = toggleFetcher.formData?.get("hasUnknownOwners");
  const checked =
    pendingValue != null ? pendingValue === "true" : hasUnknownOwners;

  const toggleUnknown = () => {
    toggleFetcher.submit(
      {
        intent: "setPreviousOwnersUnknown",
        motorcycleId: String(motorcycleId),
        hasUnknownOwners: checked ? "false" : "true",
      },
      { method: "post" },
    );
  };

  const persistOrder = (nextOwners: PreviousOwner[]) => {
    if (isSavingOrder) return;
    setOrderedOwners(nextOwners);
    setOrderError(null);
    orderFetcher.submit(
      {
        intent: "reorderPreviousOwners",
        motorcycleId: String(motorcycleId),
        ownerIds: JSON.stringify(nextOwners.map((owner) => owner.id)),
      },
      { method: "post" },
    );
  };

  const moveOwner = (ownerId: number, offset: -1 | 1) => {
    const sourceIndex = orderedOwners.findIndex((owner) => owner.id === ownerId);
    const targetIndex = sourceIndex + offset;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= orderedOwners.length) return;

    persistOrder(movePreviousOwner(orderedOwners, ownerId, targetIndex));
  };

  const dropOwner = (targetOwnerId: number) => {
    const sourceOwnerId = draggedOwnerId.current;
    draggedOwnerId.current = null;
    if (sourceOwnerId == null || sourceOwnerId === targetOwnerId) return;

    const targetIndex = orderedOwners.findIndex((owner) => owner.id === targetOwnerId);
    if (targetIndex < 0) return;

    persistOrder(movePreviousOwner(orderedOwners, sourceOwnerId, targetIndex));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      code="§ VB"
      title="Vorbesitzer verwalten"
      description="Bearbeite die Besitzerkette dieses Fahrzeugs."
    >
      <div className="space-y-5">
        <label
          aria-label="Weitere Vorbesitzer unbekannt"
          className="flex cursor-pointer items-start gap-3 rounded-sm border border-base-300 p-3 transition-colors hover:border-base-content/30 dark:border-navy-700"
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={toggleUnknown}
            disabled={toggleFetcher.state !== "idle"}
            className="checkbox checkbox-sm checkbox-warning mt-0.5"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-base-content dark:text-white">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Weitere Vorbesitzer unbekannt
            </span>
            <span className="mt-0.5 block text-xs text-base-content/60">
              Es gibt weitere, nicht erfasste Vorbesitzer – die Besitzhistorie ist
              unvollständig. Die „N. Hand“-Angabe wird dann nicht mehr angezeigt.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="label-tag">
              <span>Erfasste Vorbesitzer</span>
            </h3>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
              {orderedOwners.length} {orderedOwners.length === 1 ? "Eintrag" : "Einträge"}
            </span>
          </div>

          {orderedOwners.length > 1 && (
            <p className="text-xs text-base-content/60">
              Der direkte Vorbesitzer steht oben. Ziehe Einträge oder nutze die Pfeiltasten.
            </p>
          )}

          {orderedOwners.length > 0 ? (
            <ul className="space-y-2">
              {orderedOwners.map((owner, index) => (
                <li
                  key={owner.id}
                  draggable={!isSavingOrder}
                  onDragStart={(event) => {
                    draggedOwnerId.current = owner.id;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(owner.id));
                  }}
                  onDragEnd={() => { draggedOwnerId.current = null; }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropOwner(owner.id);
                  }}
                  aria-label={`${owner.name} ${owner.surname}, Position ${index + 1}`}
                  className="group relative flex items-center gap-2 rounded-sm border border-base-300 bg-base-100 px-2 py-2.5 transition-colors hover:border-base-content/25 dark:border-navy-700 dark:bg-navy-900/50"
                >
                  <GripVertical
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 cursor-grab text-base-content/35 active:cursor-grabbing dark:text-navy-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-subdisplay text-sm text-base-content dark:text-white">
                      {owner.name} {owner.surname}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
                      {index === 0 ? "Direkter Vorbesitzer" : `Position ${index + 1}`}
                      {owner.purchaseDate ? ` · Kauf ${owner.purchaseDate}` : " · Kaufdatum unbekannt"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => moveOwner(owner.id, -1)}
                      disabled={index === 0 || isSavingOrder}
                      aria-label={`${owner.name} ${owner.surname} nach oben verschieben`}
                      className="rounded-sm p-1.5 text-base-content/50 transition-all hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-25 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-white"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOwner(owner.id, 1)}
                      disabled={index === orderedOwners.length - 1 || isSavingOrder}
                      aria-label={`${owner.name} ${owner.surname} nach unten verschieben`}
                      className="rounded-sm p-1.5 text-base-content/50 transition-all hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-25 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-white"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditOwner(owner)}
                    disabled={isSavingOrder}
                    aria-label={`${owner.name} ${owner.surname} bearbeiten`}
                    className="rounded-sm p-1.5 text-base-content/50 transition-all hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-sm border border-dashed border-base-300 px-3 py-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50 dark:border-navy-700">
              Keine Vorbesitzer erfasst
            </p>
          )}

          {isSavingOrder && (
            <output className="block text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Reihenfolge wird gespeichert …
            </output>
          )}
          {orderError && (
            <p role="alert" className="text-sm text-error">
              {orderError}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onAddOwner}
            leftIcon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            Vorbesitzer hinzufügen
          </Button>
        </div>

        <div className="flex justify-end border-t border-base-300 pt-4 dark:border-navy-700">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fertig
          </Button>
        </div>
      </div>
    </Modal>
  );
}
