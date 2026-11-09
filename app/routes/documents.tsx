import { data, useActionData, useSubmit, useLocation, useNavigate } from "react-router";
import { useCallback, useMemo } from "react";
import type { Route } from "./+types/documents";
import { requireUser } from "~/services/auth";
import { FileText, Plus, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import type { DocumentSummary } from "~/components/document-card";
import { DocumentTable, type DocumentBikeChip } from "~/components/document-table";
import { Card, CardHeading } from "~/components/card";
import { useTheme } from "~/components/theme-provider";
import { SERIES_COLORS } from "~/utils/map-analysis";
import type { Motorcycle } from "~/types/db";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { fetchFromBackend } from "~/utils/backend";
import { getDocumentsPayload, invalidateDocuments } from "~/services/documents";
import clsx from "clsx";
import { toast } from "~/hooks/use-toast";
import { EmptyState } from "~/components/empty-state";
import { PageHeader } from "~/components/page-header";
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
  const [bikeFilter, setBikeFilter] = useState<number | null>(null);
  // A file dropped on the page; `uploadKey` remounts the form for each drop.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const { theme } = useTheme();
  const mode = theme === "dark" ? "dark" : "light";

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

  // Same colour per bike as Statistiken and Karte: own bikes by ascending id.
  // Bikes of other users stay neutral.
  const bikeColors = useMemo(() => {
    const map = new Map<number, string>();
    allMotorcycles
      .filter((m) => m.userId === user.id)
      .sort((a, b) => a.id - b.id)
      .forEach((m, i) => map.set(m.id, SERIES_COLORS[Math.min(i, SERIES_COLORS.length - 1)][mode]));
    return map;
  }, [allMotorcycles, user.id, mode]);

  const documentBikes = useMemo(() => {
    const byId = new Map(allMotorcycles.map((m) => [m.id, m]));
    const result: Record<number, DocumentBikeChip[]> = {};
    for (const a of assignments) {
      const moto = byId.get(a.motorcycleId);
      if (!moto) continue;
      const list = (result[a.documentId] ??= []);
      if (list.some((b) => b.id === moto.id)) continue;
      const name = [moto.make, moto.model].filter(Boolean).join(" ") || `Motorrad #${moto.id}`;
      list.push({ id: moto.id, name, color: bikeColors.get(moto.id) });
    }
    return result;
  }, [allMotorcycles, assignments, bikeColors]);

  const docsWithAnyBike = docs.filter((d) => (documentBikes[d.id]?.length ?? 0) > 0).length;

  // Bikes that carry at least one document — own bikes first.
  const bikeOptions = [
    ...new Map(Object.values(documentBikes).flat().map((b) => [b.id, b] as const)).values(),
  ].sort(
    (a, b) => Number(!myMotorcycleIds.has(a.id)) - Number(!myMotorcycleIds.has(b.id)) || a.name.localeCompare(b.name, "de-CH"),
  );

  const visibleDocs =
    bikeFilter === null
      ? filteredAndSortedDocs
      : filteredAndSortedDocs.filter((d) => documentBikes[d.id]?.some((b) => b.id === bikeFilter));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const file = accepted[0];
      if (!file) return;
      setEditingDocument(undefined);
      setPendingFile(file);
      setUploadKey((k) => k + 1);
      setIsEditorOpen(true);
    },
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      toast.error(
        "Datei nicht verwendbar",
        code === "file-too-large" ? "Die Datei ist zu gross (max. 20 MB)." : "Erlaubt sind PDF- und Bilddateien.",
      );
    },
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".heic", ".heif", ".tif", ".tiff"],
    },
    maxSize: 20 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
  });

  const openCreateDialog = () => {
    setEditingDocument(undefined);
    setPendingFile(null);
    setUploadKey((k) => k + 1);
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

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: "Alle", count: counts.all },
    { id: "mine", label: "Meine", count: counts.mine },
    { id: "assigned", label: "Zugeordnet", count: counts.assigned },
    { id: "others", label: "Andere", count: counts.others },
  ];
  const listTitle = {
    all: "Alle Dokumente",
    mine: "Meine Dokumente",
    assigned: "Meinen Motorrädern zugeordnet",
    others: "Dokumente anderer",
  }[filter];

  const privateCount = docs.filter((d) => d.isPrivate).length;
  const description = [
    `${docs.length} ${docs.length === 1 ? "Dokument" : "Dokumente"}`,
    `${docsWithAnyBike} einem Motorrad zugeordnet`,
    docs.length === 0 ? null : privateCount === 0 ? "alle öffentlich" : `${privateCount} privat`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-24 md:p-6">
      <PageHeader
        eyebrow="Archiv"
        title="Dokumente"
        description={description}
        actions={
          <Button onClick={openCreateDialog} leftIcon={<Plus className="h-4 w-4" />} className="shrink-0">
            Hochladen
          </Button>
        }
      />

      {/* Toolbar — ownership chips left, bike filter right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Filter</legend>
          {filters.map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  "h-[34px] rounded-sm border px-3 font-mono text-xs font-bold uppercase tracking-[0.08em] tabular-nums transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                    : "border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700",
                )}
              >
                {f.label}
                {f.count > 0 && ` · ${f.count}`}
              </button>
            );
          })}
        </fieldset>
        {bikeOptions.length > 0 && (
          <label className="flex h-10 items-center gap-2 rounded-sm border border-base-300 bg-base-100 px-2.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300">
            Motorrad
            <select
              value={bikeFilter === null ? "all" : String(bikeFilter)}
              onChange={(e) => setBikeFilter(e.target.value === "all" ? null : Number(e.target.value))}
              className="max-w-[12rem] border-none bg-transparent py-0 pl-0 pr-7 font-sans text-sm font-semibold normal-case tracking-normal text-base-content focus:ring-0 dark:text-white"
            >
              <option value="all">Alle Motorräder</option>
              {bikeOptions.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <Card>
        <CardHeading
          title={listTitle}
          meta={`${visibleDocs.length} ${visibleDocs.length === 1 ? "Eintrag" : "Einträge"}`}
        />
        {visibleDocs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={FileText}
              size="sm"
              title="Keine Dokumente gefunden"
              description={
                filter === "all" && bikeFilter === null
                  ? "Es sind momentan keine Dokumente verfügbar."
                  : "Keine Dokumente für den gewählten Filter gefunden."
              }
            />
          </div>
        ) : (
          <DocumentTable
            documents={visibleDocs}
            bikesByDocument={documentBikes}
            currentUserId={user.id}
            formatDate={formatDate}
            onEdit={openEditDialog}
          />
        )}
      </Card>

      {/* Upload drop zone — a dropped file opens the upload dialog prefilled */}
      <section
        {...getRootProps({
          "aria-label": "Dokument hochladen",
          className: clsx(
            "flex cursor-pointer flex-wrap items-center justify-center gap-3.5 rounded-sm border border-dashed bg-base-100 px-5 py-7 text-center transition-colors dark:bg-navy-800",
            isDragActive
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-base-content/35 hover:border-primary/60 dark:border-navy-600",
          ),
        })}
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-sm text-base-content/70 dark:text-navy-300">
          {isDragActive ? (
            "Datei loslassen, um sie hochzuladen."
          ) : (
            <>
              PDF oder Bild hierher ziehen oder <span className="font-semibold text-primary underline-offset-2 hover:underline">Datei wählen</span> — danach Motorrad zuordnen.
            </>
          )}
        </span>
      </section>

      {/* Editor Modal (Create / Edit) */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingDocument ? "Dokument bearbeiten" : "Datei hochladen"}
        description={editingDocument ? "Bearbeite Details oder ersetze die Datei." : "Lade eine neue PDF- oder Bilddatei hoch."}
      >
        <AddDocumentForm
          key={editingDocument ? editingDocument.id : `new-${uploadKey}`}
          initialFile={editingDocument ? null : pendingFile}
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
