import { useEffect, useState } from "react";
import {
  data,
  Link,
  useFetcher,
  useParams,
  useRevalidator,
  useLocation,
} from "react-router";
import type { Route } from "./+types/motorcycle.detail.documents";
import type { DocumentSummary } from "~/components/document-card";
import { requireUser, mergeHeaders } from "~/services/auth.server";
import { DocumentCard } from "~/components/document-card";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { FileText } from "lucide-react";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { fetchFromBackend } from "~/utils/backend.server";

export type DocumentWithAssignment = DocumentSummary & {
  assignedMotorcycleNames: string[];
};

export type DocumentAssignment = {
  documentId: number;
  motorcycleId: number;
};

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.motorcycle) {
    return [{ title: "Dokumente - Moto Manager" }];
  }
  const { make, model } = data.motorcycle;
  return [
    { title: `Dokumente: ${make} ${model} - Moto Manager` },
    { name: "description", content: `Dokumente und Unterlagen für ${make} ${model}.` },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user, token, headers } = await requireUser(request);

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = Number(params.id);
  if (!Number.isFinite(motorcycleId)) {
    throw new Response("Invalid motorcycle ID", { status: 400 });
  }

  const response = await fetchFromBackend<any>(`/motorcycles/${motorcycleId}`, {}, token);

  return data({
    ...response,
    userId: user.id,
  }, { headers: mergeHeaders(headers ?? {}) });
}

export default function MotorcycleDocumentsPage({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    nextInspection,
    currentLocationName,
    assignedDocs,
    unassignedDocs,
    userId,
    allMotorcycles,
    docAssignments,
  } = loaderData;
  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug ?? createMotorcycleSlug(motorcycle.make, motorcycle.model);
  const motorcycleIdParam = params.id ?? motorcycle.id.toString();
  const basePath = `/motorcycle/${slug}/${motorcycleIdParam}`;
  const location = useLocation();
  const normalizePath = (path: string) => path.replace(/\/+$/, "");
  const overviewLink = {
    to: basePath,
    isActive: normalizePath(location.pathname) === normalizePath(basePath),
  };
  const navLinks = [
    { label: "Dokumente", to: `${basePath}/documents`, isActive: true },
    { label: "Anzugsmomente", to: `${basePath}/torque-specs`, isActive: false },
  ];

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("de-CH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const documentsToDisplay = [...assignedDocs, ...unassignedDocs];
  const assignmentMap: Record<number, number[]> = {};
  for (const assignment of docAssignments) {
    if (!assignmentMap[assignment.documentId]) {
      assignmentMap[assignment.documentId] = [];
    }
    assignmentMap[assignment.documentId]!.push(assignment.motorcycleId);
  }

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentWithAssignment | null>(null);
  const editFetcher = useFetcher<{ success?: boolean }>();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditorOpen(false);
      setDeleteConfirmationOpen(false);
      setEditingDocument(null);
      revalidator.revalidate();
    }
  }, [editFetcher.state, editFetcher.data, revalidator]);

  const assignedIdsForEditing = editingDocument
    ? assignmentMap[editingDocument.id] ?? []
    : [];

  const isSubmitting = editFetcher.state !== "idle";

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-0 md:p-6 md:space-y-8">
      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        backTo={basePath}
        overviewLink={overviewLink}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground dark:text-white">Dokumente</h2>
            <p className="text-sm text-secondary dark:text-navy-400">
              Zugeordnete und allgemeine Dokumente für {motorcycle.make} {motorcycle.model}
            </p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
          >
            Alle Dokumente
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {documentsToDisplay.length === 0 ? (
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
            documentsToDisplay.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                formatDate={formatDate}
                isOwner={doc.ownerId === userId}
                onEdit={() => {
                  setEditingDocument(doc);
                  setIsEditorOpen(true);
                }}
                assignedMotorcycleNames={doc.assignedMotorcycleNames}
              />
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditorOpen && Boolean(editingDocument)}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingDocument(null);
          setDeleteConfirmationOpen(false);
        }}
        title="Dokument bearbeiten"
        description="Passe Details oder Zuordnungen an."
      >
        {editingDocument && (
          <AddDocumentForm
            key={editingDocument.id}
            document={editingDocument}
            motorcycles={allMotorcycles}
            currentUserId={userId}
            assignedMotorcycleIds={assignedIdsForEditing}
            onSubmit={() => {
              setIsEditorOpen(false);
              setEditingDocument(null);
            }}
            onDelete={() => setDeleteConfirmationOpen(true)}
            onSubmitFormData={(formData, options) => {
              editFetcher.submit(formData, {
                ...options,
                action: "/documents",
              });
            }}
            isSubmittingOverride={isSubmitting}
          />
        )}
      </Modal>

      <DeleteConfirmationDialog
        isOpen={deleteConfirmationOpen && Boolean(editingDocument)}
        title="Dokument löschen"
        description="Bist du sicher, dass du dieses Dokument löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden."
        onCancel={() => setDeleteConfirmationOpen(false)}
        onConfirm={() => {
          if (!editingDocument) return;
          const formData = new FormData();
          formData.append("intent", "delete");
          formData.append("id", editingDocument.id.toString());
          editFetcher.submit(formData, {
            method: "post",
            action: "/documents",
          });
        }}
        confirmDisabled={isSubmitting}
      />
    </div>
  );
}
