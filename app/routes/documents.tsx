import { data, useActionData, useSubmit, useLocation, useNavigate } from "react-router";
import { useCallback, useMemo } from "react";
import type { Route } from "./+types/documents";
import { requireUser } from "~/services/auth";
import { FileText, Plus, User as UserIcon, Bike, Globe, Filter, type LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import { DocumentCard, type DocumentSummary } from "~/components/document-card";
import type { Motorcycle } from "~/types/db";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { fetchFromBackend } from "~/utils/backend";
import { getDocumentsPayload, invalidateDocuments } from "~/services/documents";
import clsx from "clsx";
import { toast } from "~/hooks/use-toast";
import { EmptyState } from "~/components/empty-state";
import { Button } from "~/components/button";

export function meta() {
  return [
    { title: "Dokumente - Moto Manager" },
    { name: "description", content: "Verwalte deine Dokumente und sehe öffentliche Dokumente anderer Nutzer." },
  ];
}

/**
 * Motorcycle entry in the `/documents` payload. The backend sends a lean
 * projection (id/userId/make/model/ownerName); it is typed as the full
 * Motorcycle to match AddDocumentForm, which only reads the projected fields.
 */
type DocumentsMotorcycle = Motorcycle & { ownerName: string | null };

interface DocumentsPayload {
  docs: DocumentSummary[];
  allMotorcycles: DocumentsMotorcycle[];
  assignments: { documentId: number; motorcycleId: number }[];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  const [response, userMotosResponse] = await Promise.all([
    getDocumentsPayload(token) as Promise<DocumentsPayload>,
    fetchFromBackend<{ motorcycles: Motorcycle[] }>("/motorcycles", {}, token),
  ]);

  const userMotoIds = new Set(
    (userMotosResponse.motorcycles ?? []).map((m) => m.id),
  );
  const allMotorcycles = (response.allMotorcycles ?? []).map((m) => ({
    ...m,
    userId: m.userId ?? (userMotoIds.has(m.id) ? user.id : null),
  }));

  return data({ ...response, allMotorcycles, user });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    try {
      await fetchFromBackend("/documents", {
        method: "POST",
        body: formData,
      }, token);
      invalidateDocuments();
      return data({ success: true, intent: "create" });
    } catch (e) {
      return data({ error: e instanceof Error ? e.message : undefined, intent: "create" }, { status: 400 });
    }
  }

  if (intent === "update") {
    const id = formData.get("id");
    try {
      await fetchFromBackend(`/documents/${id}`, {
        method: "PUT",
        body: formData,
      }, token);
      invalidateDocuments();
      return data({ success: true, intent: "update" });
    } catch (e) {
      return data({ error: e instanceof Error ? e.message : undefined, intent: "update" }, { status: 400 });
    }
  }

  if (intent === "delete") {
    const id = formData.get("id");
    try {
      await fetchFromBackend(`/documents/${id}`, {
        method: "DELETE",
      }, token);
      invalidateDocuments();
      return data({ success: true, intent: "delete" });
    } catch (e) {
      return data({ error: e instanceof Error ? e.message : undefined, intent: "delete" }, { status: 400 });
    }
  }

  return null;
}

type FilterType = "all" | "mine" | "assigned" | "others";

export default function Documents({ loaderData }: Route.ComponentProps) {
  const { docs = [], user, allMotorcycles = [], assignments = [] } = loaderData;
  const [filter, setFilter] = useState<FilterType>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<typeof docs[0] | undefined>(undefined);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const actionData = useActionData<{ success?: boolean; error?: string; intent?: string }>();
  const submit = useSubmit();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success) {
      switch (actionData.intent) {
        case "create":
          toast.success("Dokument hinzugefügt");
          break;
        case "update":
          toast.success("Dokument aktualisiert");
          break;
        case "delete":
          toast.success("Dokument gelöscht");
          break;
      }
      setTimeout(() => {
        setDeleteConfirmationOpen(false);
        setIsEditorOpen(false);
        setEditingDocument(undefined);
      }, 0);
    } else if (actionData?.error) {
      toast.error("Fehler", actionData.error);
    }
  }, [actionData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-CH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getAssignedMotorcycleIds = (docId?: number) => {
    if (!docId) return [];
    return assignments
      .filter((a) => a.documentId === docId)
      .map((a) => a.motorcycleId);
  };

  const myMotorcycleIds = useMemo(() =>
    new Set(allMotorcycles.filter(m => m.userId === user.id).map(m => m.id)),
    [allMotorcycles, user.id]
  );

  const assignedToMeDocIds = useMemo(() => {
    const docIds = new Set<number>();
    assignments.forEach(a => {
      if (myMotorcycleIds.has(a.motorcycleId)) {
        docIds.add(a.documentId);
      }
    });
    return docIds;
  }, [assignments, myMotorcycleIds]);

  const filteredAndSortedDocs = useMemo(() => {
    let result = [...docs];

    // Filtering
    if (filter === "mine") {
      result = result.filter(d => d.ownerId === user.id);
    } else if (filter === "assigned") {
      result = result.filter(d => assignedToMeDocIds.has(d.id));
    } else if (filter === "others") {
      result = result.filter(d => d.ownerId !== user.id);
    }

    // Sorting: Mine > Assigned to my bikes > Others
    result.sort((a, b) => {
      const isOwnerA = a.ownerId === user.id;
      const isOwnerB = b.ownerId === user.id;
      const isAssignedA = assignedToMeDocIds.has(a.id);
      const isAssignedB = assignedToMeDocIds.has(b.id);

      const scoreA = isOwnerA ? 0 : isAssignedA ? 1 : 2;
      const scoreB = isOwnerB ? 0 : isAssignedB ? 1 : 2;

      if (scoreA !== scoreB) return scoreA - scoreB;

      // Secondary sort by date desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [docs, filter, user.id, assignedToMeDocIds]);

  const counts = useMemo(() => ({
    all: docs.length,
    mine: docs.filter((d) => d.ownerId === user.id).length,
    assigned: docs.filter((d) => assignedToMeDocIds.has(d.id)).length,
    others: docs.filter((d) => d.ownerId !== user.id).length,
  }), [docs, user.id, assignedToMeDocIds]);

  const motorcycleNameMap = new Map(
    allMotorcycles.map((moto) => {
      const nameParts = [moto.make, moto.model].filter(Boolean);
      const label = nameParts.length > 0 ? nameParts.join(" ") : `Motorrad #${moto.id}`;
      return [moto.id, label];
    })
  );

  const documentMotorcycleNames = assignments.reduce<Record<number, string[]>>((acc, assignment) => {
    const label = motorcycleNameMap.get(assignment.motorcycleId);
    if (!label) return acc;
    if (!acc[assignment.documentId]) {
      acc[assignment.documentId] = [];
    }
    if (!acc[assignment.documentId].includes(label)) {
      acc[assignment.documentId].push(label);
    }
    return acc;
  }, {});

  const openCreateDialog = () => {
    setEditingDocument(undefined);
    setIsEditorOpen(true);
  };

  const openEditDialog = useCallback((doc: typeof docs[0]) => {
    setEditingDocument(doc);
    setIsEditorOpen(true);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const docIdParam = searchParams.get("doc");
    if (!docIdParam) return;
    const docToEdit = docs.find((d) => d.id === Number(docIdParam));
    if (!docToEdit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openEditDialog(docToEdit);
    searchParams.delete("doc");
    navigate(
      {
        pathname: location.pathname,
        search: searchParams.toString() ? `?${searchParams.toString()}` : "",
      },
      { replace: true }
    );
  }, [location.search, docs, navigate, openEditDialog, location.pathname]);

  const filters: { id: FilterType; label: string; icon: LucideIcon; count: number }[] = [
    { id: "all", label: "Alle", icon: Filter, count: counts.all },
    { id: "mine", label: "Meine", icon: UserIcon, count: counts.mine },
    { id: "assigned", label: "Zugeordnet", icon: Bike, count: counts.assigned },
    { id: "others", label: "Andere", icon: Globe, count: counts.others },
  ];

  return (
    <div className="container mx-auto space-y-4 px-4 pt-3 pb-24">
      {/* Filter Tabs + Upload — single row so the button has a real
          neighbor instead of floating in a separate band of whitespace. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3 dark:border-navy-700">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => {
            const Icon = f.icon;
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  isActive
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30 dark:bg-primary/25 dark:text-primary-light"
                    : "border-base-300 bg-base-100 text-base-content/65 hover:bg-base-200 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800",
                )}
              >
                <Icon className={clsx("h-3.5 w-3.5", isActive ? "text-primary dark:text-primary-light" : "text-base-content/55 dark:text-navy-400")} aria-hidden="true" />
                {f.label}
                {f.count > 0 && (
                  <span
                    className={clsx(
                      "ml-1 inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-sm px-1 font-numeric text-[10px] font-semibold tabular-nums",
                      isActive
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content/60 dark:bg-navy-700 dark:text-navy-300",
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Button
          onClick={openCreateDialog}
          stripe
          leftIcon={<Plus className="h-4 w-4" />}
          className="ml-auto shrink-0"
        >
          Hochladen
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {filteredAndSortedDocs.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={FileText}
              title="Keine Dokumente gefunden"
              description={
                filter === "all"
                  ? "Es sind momentan keine Dokumente verfügbar."
                  : "Keine Dokumente für den gewählten Filter gefunden."
              }
            />
          </div>
        ) : (
          filteredAndSortedDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              formatDate={formatDate}
              isOwner={user.id === doc.ownerId}
              onEdit={openEditDialog}
              assignedMotorcycleNames={documentMotorcycleNames[doc.id] ?? []}
            />
          ))
        )}
      </div>

      {/* Editor Modal (Create / Edit) */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingDocument ? "Dokument bearbeiten" : "Datei hochladen"}
        description={editingDocument ? "Bearbeite Details oder ersetze die Datei." : "Lade eine neue PDF- oder Bilddatei hoch."}
      >
        <AddDocumentForm
          key={editingDocument ? editingDocument.id : "new"}
          document={editingDocument}
          motorcycles={allMotorcycles}
          currentUserId={user.id}
          assignedMotorcycleIds={getAssignedMotorcycleIds(editingDocument?.id)}
          onSubmit={() => {
            if (!editingDocument) setIsEditorOpen(false); // Close on cancel for create
          }}
          onDelete={() => setDeleteConfirmationOpen(true)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationOpen}
        title="Dokument löschen"
        description="Bist du sicher, dass du dieses Dokument löschen möchtest? Dies kann nicht rückgängig gemacht werden."
        onCancel={() => setDeleteConfirmationOpen(false)}
        onConfirm={() => {
          if (editingDocument) {
            const formData = new FormData();
            formData.append("intent", "delete");
            formData.append("id", editingDocument.id.toString());
            submit(formData, {
              method: "post",
            });
          }
        }}
      />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
