import { data, useActionData, useSubmit, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/documents";
import { getDb } from "~/db";
import { documents, users, motorcycles, documentMotorcycles } from "~/db/schema";
import { eq, or, desc, inArray, getTableColumns } from "drizzle-orm";
import { requireUser } from "~/services/auth.server";
import { FileText, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { AddDocumentForm } from "~/components/add-document-form";
import { DocumentCard } from "~/components/document-card";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
]);

const UNSUPPORTED_FILE_MESSAGE = "Nur PDF- oder Bilddateien sind erlaubt.";

function isPdfFile(file: File) {
  const mimeType = file.type?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";
  return mimeType === "application/pdf" || name.endsWith(".pdf");
}

function isImageFile(file: File) {
  const mimeType = file.type?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) {
    return true;
  }
  const ext = path.extname(file.name || "").toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
}

function getFileCategory(file: File): "pdf" | "image" | null {
  if (isPdfFile(file)) return "pdf";
  if (isImageFile(file)) return "image";
  return null;
}

async function deleteFileIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore error if file doesn't exist
  }
}

async function generatePdfPreview(
  pdfPath: string,
  outputPath: string,
): Promise<boolean> {
  try {
    await execFileAsync("sips", [
      "-s",
      "format",
      "png",
      pdfPath,
      "--out",
      outputPath,
    ]);
    return true;
  } catch (error) {
    console.warn("PDF preview generation failed", error);
    await deleteFileIfExists(outputPath);
    return false;
  }
}

async function saveDocumentFile(file: File) {
  const fileCategory = getFileCategory(file);
  if (!fileCategory) {
    throw new Error("Unsupported file type");
  }

  const documentsDir = path.join(process.cwd(), "data", "documents");
  const previewsDir = path.join(process.cwd(), "data", "previews");
  await fs.mkdir(documentsDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });

  const originalExtension = path.extname(file.name || "").toLowerCase();
  const defaultExtension = fileCategory === "pdf" ? ".pdf" : ".png";
  const validImageExtension =
    fileCategory === "image" && SUPPORTED_IMAGE_EXTENSIONS.has(originalExtension)
      ? originalExtension
      : null;
  const extension =
    fileCategory === "pdf"
      ? ".pdf"
      : validImageExtension || (originalExtension && originalExtension !== ".pdf" ? originalExtension : defaultExtension);

  const fileName = `${uuidv4()}${extension}`;
  const absoluteFilePath = path.join(documentsDir, fileName);

  await fs.writeFile(absoluteFilePath, Buffer.from(await file.arrayBuffer()));

  let previewPath: string | null = null;

  if (fileCategory === "pdf") {
    const previewName = `${uuidv4()}.png`;
    const previewFilePath = path.join(previewsDir, previewName);
    const previewGenerated = await generatePdfPreview(absoluteFilePath, previewFilePath);

    if (previewGenerated) {
      previewPath = `/data/previews/${previewName}`;
    }
  } else {
    previewPath = `/data/documents/${fileName}`;
  }

  return {
    filePath: `/data/documents/${fileName}`,
    previewPath,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const db = await getDb();

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      filePath: documents.filePath,
      previewPath: documents.previewPath,
      uploadedBy: documents.uploadedBy,
      ownerId: documents.ownerId,
      isPrivate: documents.isPrivate,
      createdAt: documents.createdAt,
      ownerName: users.username,
    })
    .from(documents)
    .leftJoin(users, eq(documents.ownerId, users.id))
    .where(or(eq(documents.isPrivate, false), eq(documents.ownerId, user.id)))
    .orderBy(desc(documents.createdAt));

  const allMotorcycles = await db
    .select({
      ...getTableColumns(motorcycles),
      ownerName: users.username,
    })
    .from(motorcycles)
    .leftJoin(users, eq(motorcycles.userId, users.id));

  // Get assignments for visible documents
  const docIds = docs.map(d => d.id);
  const assignments = docIds.length > 0 ? await db
    .select()
    .from(documentMotorcycles)
    .where(inArray(documentMotorcycles.documentId, docIds)) : [];

  return data({ docs, user, allMotorcycles, assignments });
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const title = String(formData.get("title"));
    const isPrivate = formData.get("isPrivate") === "true";
    const file = formData.get("file") as File;
    const motorcycleIds = formData.getAll("motorcycleIds").map(Number);

    if (!file || file.size === 0) {
        return data({ error: "Keine Datei ausgewählt." }, { status: 400 });
    }

    if (!getFileCategory(file)) {
        return data({ error: UNSUPPORTED_FILE_MESSAGE }, { status: 400 });
    }

    const { filePath, previewPath } = await saveDocumentFile(file);

    const db = await getDb();
    
    await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(documents).values({
            title,
            filePath,
            previewPath,
            uploadedBy: user.username,
            ownerId: user.id,
            isPrivate,
        }).returning({ id: documents.id });

        if (motorcycleIds.length > 0) {
            await tx.insert(documentMotorcycles).values(
                motorcycleIds.map(mid => ({
                    documentId: inserted.id,
                    motorcycleId: mid
                }))
            );
        }
    });

    return data({ success: true });
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const title = String(formData.get("title"));
    const isPrivate = formData.get("isPrivate") === "true";
    const motorcycleIds = formData.getAll("motorcycleIds").map(Number);
    const file = formData.get("file") as File | null;

    const db = await getDb();
    
    // Verify ownership
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc || doc.ownerId !== user.id) {
        throw new Response("Unauthorized", { status: 403 });
    }

    // Handle File Replacement
    let newPaths = {};
    if (file && file.size > 0) {
        if (!getFileCategory(file)) {
            return data({ error: UNSUPPORTED_FILE_MESSAGE }, { status: 400 });
        }

        // Delete old files
        try {
            const oldFilePath = path.join(process.cwd(), doc.filePath.replace("/data/documents", "data/documents"));
            await fs.unlink(oldFilePath).catch(() => {});
            if (doc.previewPath) {
                const oldPreviewPath = path.join(process.cwd(), doc.previewPath.replace("/data/previews", "data/previews"));
                await fs.unlink(oldPreviewPath).catch(() => {});
            }
        } catch (e) { console.error("Error cleaning up old files", e); }

        newPaths = await saveDocumentFile(file);
    }

    await db.transaction(async (tx) => {
        await tx
          .update(documents)
          .set({ 
              title, 
              isPrivate, 
              updatedAt: new Date().toISOString(),
              ...newPaths 
          })
          .where(eq(documents.id, id));

        // Update assignments
        await tx.delete(documentMotorcycles).where(eq(documentMotorcycles.documentId, id));
        
        if (motorcycleIds.length > 0) {
            await tx.insert(documentMotorcycles).values(
                motorcycleIds.map(mid => ({
                    documentId: id,
                    motorcycleId: mid
                }))
            );
        }
    });

    return data({ success: true });
  }

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    const db = await getDb();

    // Verify ownership
    const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);

    if (!doc || doc.ownerId !== user.id) {
        throw new Response("Unauthorized", { status: 403 });
    }

    // Delete files
    try {
        const fullFilePath = path.join(process.cwd(), doc.filePath.replace("/data/documents", "data/documents"));
        await fs.unlink(fullFilePath).catch(() => {});
        
        if (doc.previewPath) {
            const fullPreviewPath = path.join(process.cwd(), doc.previewPath.replace("/data/previews", "data/previews"));
            await fs.unlink(fullPreviewPath).catch(() => {});
        }
    } catch (e) {
        console.error("Error deleting files:", e);
    }

    await db.delete(documents).where(eq(documents.id, id));

    return data({ success: true });
  }

  return null;
}

export default function Documents({ loaderData }: Route.ComponentProps) {
  const { docs, user, allMotorcycles, assignments } = loaderData;
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
    return assignments
      .filter(a => a.documentId === docId)
      .map(a => a.motorcycleId);
  };

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

  const openEditDialog = (doc: typeof docs[0]) => {
      setEditingDocument(doc);
      setIsEditorOpen(true);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const docIdParam = searchParams.get("doc");
    if (!docIdParam) return;
    const docToEdit = docs.find((d) => d.id === Number(docIdParam));
    if (!docToEdit) return;
    openEditDialog(docToEdit);
    searchParams.delete("doc");
    navigate(
      {
        pathname: location.pathname,
        search: searchParams.toString() ? `?${searchParams.toString()}` : "",
      },
      { replace: true }
    );
  }, [location.search, docs, navigate]);

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
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
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
          docs.map((doc) => (
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
