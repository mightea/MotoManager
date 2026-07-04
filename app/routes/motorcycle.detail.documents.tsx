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
import { requireUser } from "~/services/auth";
import { DocumentCard } from "~/components/document-card";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { FileText } from "lucide-react";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { fetchFromBackend } from "~/utils/backend";
import { getDocumentsPayload } from "~/services/documents";
import { computeMotorcycleHeaderStats } from "~/utils/motorcycle-header-stats";

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

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = Number(params.id);
  if (!Number.isFinite(motorcycleId)) {
    throw new Response("Invalid motorcycle ID", { status: 400 });
  }

  const [motoResponse, docsResponse, userMotosResponse] = await Promise.all([
    fetchFromBackend<any>(`/motorcycles/${motorcycleId}`, {}, token),
    getDocumentsPayload(token),
    fetchFromBackend<{ motorcycles: any[] }>(`/motorcycles`, {}, token),
  ]);

  // Only depends on motoResponse — start the fetch before the sync work below.
  const headerStatsPromise = computeMotorcycleHeaderStats(motoResponse, token, user.id);

  const allDocs: any[] = docsResponse.docs ?? [];
  const userMotoIds = new Set(
    (userMotosResponse.motorcycles ?? []).map((m: any) => m.id),
  );
  const allMotorcycles: any[] = (docsResponse.allMotorcycles ?? []).map(
    (m: any) => ({
      ...m,
      userId: m.userId ?? (userMotoIds.has(m.id) ? user.id : null),
    }),
  );
  const assignments: DocumentAssignment[] = docsResponse.assignments ?? [];

  const motorcycleNameById = new Map<number, string>(
    allMotorcycles.map((moto: any) => {
      const nameParts = [moto.make, moto.model].filter(Boolean);
      const label = nameParts.length > 0 ? nameParts.join(" ") : `Motorrad #${moto.id}`;
      return [moto.id, label];
    }),
  );

  const namesByDocId: Record<number, string[]> = {};
  for (const assignment of assignments) {
    const label = motorcycleNameById.get(assignment.motorcycleId);
    if (!label) continue;
    const bucket = namesByDocId[assignment.documentId] ?? (namesByDocId[assignment.documentId] = []);
    if (!bucket.includes(label)) bucket.push(label);
  }

  const decorate = (doc: any) => ({
    ...doc,
    assignedMotorcycleNames: namesByDocId[doc.id] ?? [],
  });

  const assignedIds = new Set(
    assignments
      .filter((a) => a.motorcycleId === motorcycleId)
      .map((a) => a.documentId),
  );

  const assignedDocs = allDocs.filter((d) => assignedIds.has(d.id)).map(decorate);

  const headerStats = await headerStatsPromise;

  return data({
    ...motoResponse,
    ...headerStats,
    assignedDocs,
    docAssignments: assignments,
    allMotorcycles,
    userId: user.id,
  });
}

export default function MotorcycleDocumentsPage({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    nextInspection,
    currentLocationName,
    assignedDocs = [],
    userId,
    allMotorcycles = [],
    docAssignments = [],
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
    { label: "Werkstattdaten", to: `${basePath}/torque-specs`, isActive: false },
  ];

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("de-CH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const documentsToDisplay = assignedDocs;
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
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 md:space-y-6">
      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        backTo={basePath}
        overviewLink={overviewLink}
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
          >
            Alle Dokumente
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {documentsToDisplay.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={FileText}
                title="Keine Dokumente"
                description="Es sind momentan keine Dokumente verfügbar."
              />
            </div>
          ) : (
            documentsToDisplay.map((doc: DocumentWithAssignment) => (
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

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
