import { useEffect, useMemo, useState } from "react";
import {
  data,
  Link,
  useFetcher,
  useParams,
  useRevalidator,
  useLocation,
} from "react-router";
import type { Route, DocumentWithAssignment } from "./+types/motorcycle.detail.documents";
import { getDb } from "~/db";
import {
  motorcycles,
  maintenanceRecords,
  documents,
  documentMotorcycles,
  locations,
  users,
} from "~/db/schema";
import { and, desc, eq, getTableColumns, inArray, isNull, or } from "drizzle-orm";
import { requireUser } from "~/services/auth.server";
import { getNextInspectionInfo } from "~/utils/inspection";
import { DocumentCard } from "~/components/document-card";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { FileText } from "lucide-react";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const db = await getDb();

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = Number(params.id);
  if (!Number.isFinite(motorcycleId)) {
    throw new Response("Invalid motorcycle ID", { status: 400 });
  }

  const motorcycle = await db.query.motorcycles.findFirst({
    where: eq(motorcycles.id, motorcycleId),
  });

  if (!motorcycle) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  if (motorcycle.userId !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const maintenanceHistory = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.motorcycleId, motorcycleId),
    orderBy: [desc(maintenanceRecords.date)],
  });

  const lastInspection =
    maintenanceHistory
      .filter((entry) => entry.type === "inspection" && entry.date)
      .map((entry) => entry.date as string)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .at(0) ?? null;

  const nextInspection = getNextInspectionInfo({
    firstRegistration: motorcycle.firstRegistration,
    lastInspection,
    isVeteran: motorcycle.isVeteran ?? false,
  });

  const userLocations = await db.query.locations.findMany({
    where: eq(locations.userId, user.id),
  });

  const currentLocationId = maintenanceHistory
    .filter((record) => record.type === "location")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    ?.locationId;

  const currentLocationName =
    userLocations.find((loc) => loc.id === currentLocationId)?.name ?? null;

  const baseDocumentSelect = {
    id: documents.id,
    title: documents.title,
    filePath: documents.filePath,
    previewPath: documents.previewPath,
    uploadedBy: documents.uploadedBy,
    ownerId: documents.ownerId,
    isPrivate: documents.isPrivate,
    createdAt: documents.createdAt,
    ownerName: users.username,
  };

  const privacyFilter = or(
    eq(documents.isPrivate, false),
    eq(documents.ownerId, user.id)
  );

  const docsAssignedRows = await db
    .select(baseDocumentSelect)
    .from(documents)
    .innerJoin(documentMotorcycles, eq(documentMotorcycles.documentId, documents.id))
    .leftJoin(users, eq(users.id, documents.ownerId))
    .where(
      and(eq(documentMotorcycles.motorcycleId, motorcycleId), privacyFilter)
    );

  const docsUnassignedRows = await db
    .select(baseDocumentSelect)
    .from(documents)
    .leftJoin(documentMotorcycles, eq(documentMotorcycles.documentId, documents.id))
    .leftJoin(users, eq(users.id, documents.ownerId))
    .where(and(isNull(documentMotorcycles.documentId), privacyFilter));

  const assignedName = `${motorcycle.make} ${motorcycle.model}`.trim();

  const assignedDocs: DocumentWithAssignment[] = docsAssignedRows.map((doc) => ({
    ...doc,
    assignedMotorcycleNames: assignedName ? [assignedName] : [],
  }));

  const unassignedDocs: DocumentWithAssignment[] = docsUnassignedRows.map((doc) => ({
    ...doc,
    assignedMotorcycleNames: ["Nicht zugeordnet"],
  }));

  assignedDocs.sort(
    (a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime()
  );
  unassignedDocs.sort(
    (a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime()
  );

  const allMotorcycles = await db
    .select({
      ...getTableColumns(motorcycles),
      ownerName: users.username,
    })
    .from(motorcycles)
    .leftJoin(users, eq(motorcycles.userId, users.id));

  const allDocIds = Array.from(
    new Set([...assignedDocs, ...unassignedDocs].map((doc) => doc.id))
  );

  const rawAssignments = allDocIds.length
    ? await db
        .select({
          documentId: documentMotorcycles.documentId,
          motorcycleId: documentMotorcycles.motorcycleId,
        })
        .from(documentMotorcycles)
        .where(inArray(documentMotorcycles.documentId, allDocIds))
    : [];

  return data({
    motorcycle,
    nextInspection,
    currentLocationName,
    assignedDocs,
    unassignedDocs,
    userId: user.id,
    allMotorcycles: allMotorcycles.map((moto) => ({
      ...moto,
      ownerName: moto.ownerName ?? null,
    })),
    docAssignments: rawAssignments,
  });
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
  const assignmentMap = useMemo(() => {
    const map: Record<number, number[]> = {};
    for (const assignment of docAssignments) {
      if (!map[assignment.documentId]) {
        map[assignment.documentId] = [];
      }
      map[assignment.documentId]!.push(assignment.motorcycleId);
    }
    return map;
  }, [docAssignments]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentWithAssignment | null>(null);
  const editFetcher = useFetcher<{ success?: boolean }>();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data?.success) {
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
                onEdit={(_selected) => {
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
