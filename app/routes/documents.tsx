import { data, useActionData, useSubmit, useLocation, useNavigate } from "react-router";
import { useCallback } from "react";
import type { Route } from "./+types/documents";
import { requireUser } from "~/services/auth";
import { FileText, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import { DocumentCard } from "~/components/document-card";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { fetchFromBackend } from "~/utils/backend";
import clsx from "clsx";

export function meta() {
  return [
    { title: "Dokumente - Moto Manager" },
    { name: "description", content: "Verwalte deine Dokumente und sehe öffentliche Dokumente anderer Nutzer." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  const response = await fetchFromBackend<any>("/documents", {}, token);

  return data({ ...response, user });
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
      return data({ success: true });
    } catch (e: any) {
      return data({ error: e.message }, { status: 400 });
    }
  }

  if (intent === "update") {
    const id = formData.get("id");
    try {
      await fetchFromBackend(`/documents/${id}`, {
        method: "PUT",
        body: formData,
      }, token);
      return data({ success: true });
    } catch (e: any) {
      return data({ error: e.message }, { status: 400 });
    }
  }

  if (intent === "delete") {
    const id = formData.get("id");
    try {
      await fetchFromBackend(`/documents/${id}`, {
        method: "DELETE",
      }, token);
      return data({ success: true });
    } catch (e: any) {
      return data({ error: e.message }, { status: 400 });
    }
  }

  return null;
}

export default function Documents({ loaderData }: Route.ComponentProps) {
  const { docs = [], user, allMotorcycles = [], assignments = [] } = loaderData;
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<typeof docs[0] | undefined>(undefined);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const actionData = useActionData<{ success?: boolean }>();
  const submit = useSubmit();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success) {
      setTimeout(() => {
        setDeleteConfirmationOpen(false);
        setIsEditorOpen(false);
        setEditingDocument(undefined);
      }, 0);
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
    return (assignments as any[])
      .filter((a: any) => a.documentId === docId)
      .map((a: any) => a.motorcycleId);
  };

  const motorcycleNameMap = new Map(
    (allMotorcycles as any[]).map((moto: any) => {
      const nameParts = [moto.make, moto.model].filter(Boolean);
      const label = nameParts.length > 0 ? nameParts.join(" ") : `Motorrad #${moto.id}`;
      return [moto.id, label];
    })
  );

  const documentMotorcycleNames = (assignments as any[]).reduce<Record<number, string[]>>((acc, assignment: any) => {
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
    const docToEdit = (docs as any[]).find((d: any) => d.id === Number(docIdParam));
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

  return (
    <div className="container mx-auto space-y-6 p-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">Dokumente</h1>
          <p className="text-secondary dark:text-navy-400">
            Verwalte deine Dokumente und sehe öffentliche Dokumente anderer Nutzer.
          </p>
        </div>
        <button
          onClick={openCreateDialog}
          disabled={isOffline}
          className={clsx(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95",
            isOffline
              ? "bg-gray-400 cursor-not-allowed opacity-50"
              : "bg-primary hover:bg-primary-dark hover:shadow-md"
          )}
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Hochladen</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {docs.length === 0 ? (
          <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center dark:border-navy-700 dark:bg-navy-800/50">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gray-100 dark:bg-navy-700">
              <FileText className="h-8 w-8 text-gray-400 dark:text-navy-300" />
            </div>
            <h3 className="text-xl font-semibold text-foreground dark:text-white">
              Keine Dokumente gefunden
            </h3>
            <p className="mt-2 max-w-sm text-secondary dark:text-navy-400">
              Es sind momentan keine Dokumente verfügbar.
            </p>
          </div>
        ) : (
          (docs as any[]).map((doc: any) => (
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
