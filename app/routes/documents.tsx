import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getDb } from "~/db";
import {
  documents,
  documentMotorcycles,
  motorcycles,
  users,
  type NewDocument,
  type NewDocumentMotorcycle,
} from "~/db/schema";
import {
  attachDocumentToMotorcycles,
  createDocument,
  updateDocument,
  detachDocumentMotorcycles,
  deleteDocument,
} from "~/db/providers/documents.server";
import { asc, desc, eq, isNull, or } from "drizzle-orm";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { data, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useMemo } from "react";
import DocumentDialog from "~/components/document-dialog";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import { DocumentList } from "~/components/document-list";

const DOCUMENTS_BASE_DIR = path.join(process.cwd(), "public", "documents");
const DOCUMENT_FILES_DIR = path.join(DOCUMENTS_BASE_DIR, "files");
const DOCUMENT_PREVIEWS_DIR = path.join(DOCUMENTS_BASE_DIR, "previews");

const DOCUMENT_FILES_PUBLIC_BASE = "/documents/files";
const DOCUMENT_PREVIEWS_PUBLIC_BASE = "/documents/previews";

function resolvePublicFilePath(relativePath: string) {
  return path.join(process.cwd(), "public", relativePath.replace(/^\/+/, ""));
}

import type { DocumentSelectableMotorcycle } from "~/components/document-dialog";

interface DocumentSummary {
  id: number;
  title: string;
  filePath: string;
  previewPath: string | null;
  isPrivate: boolean;
  ownerId: number | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string | null;
  motorcycles: Array<{
    id: number;
    make: string;
    model: string;
    numberPlate: string | null;
    ownerUsername: string | null;
  }>;
}

type LoaderData = {
  documents: DocumentSummary[];
  motorcycles: DocumentSelectableMotorcycle[];
};

async function ensureDocumentDirs() {
  try {
    await fs.mkdir(DOCUMENT_FILES_DIR, { recursive: true });
    await fs.mkdir(DOCUMENT_PREVIEWS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function deleteFileIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

const execFileAsync = promisify(execFile);

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

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const currentIdentifiers = new Set(
    [user.username, user.name, user.email]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  const resolveOwnerLabel = (
    username?: string | null,
    name?: string | null,
  ) => {
    const trimmedUsername = username?.trim();
    if (trimmedUsername && !currentIdentifiers.has(trimmedUsername)) {
      return trimmedUsername;
    }

    const trimmedName = name?.trim();
    if (trimmedName && !currentIdentifiers.has(trimmedName)) {
      return trimmedName;
    }

    return null;
  };

  const allMotorcyclesRaw = await db
    .select({
      id: motorcycles.id,
      make: motorcycles.make,
      model: motorcycles.model,
      numberPlate: motorcycles.numberPlate,
      userId: motorcycles.userId,
      ownerUsername: users.username,
      ownerName: users.name,
    })
    .from(motorcycles)
    .leftJoin(users, eq(users.id, motorcycles.userId))
    .orderBy(asc(motorcycles.make), asc(motorcycles.model));

  const userMotorcycleIdSet = new Set(
    allMotorcyclesRaw
      .filter((moto) => moto.userId === user.id)
      .map((moto) => moto.id),
  );

  const docsRaw = await db
    .select({
      id: documents.id,
      title: documents.title,
      filePath: documents.filePath,
      previewPath: documents.previewPath,
      isPrivate: documents.isPrivate,
      ownerId: documents.ownerId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      uploadedBy: documents.uploadedBy,
      motorcycleId: documentMotorcycles.motorcycleId,
      motorcycleMake: motorcycles.make,
      motorcycleModel: motorcycles.model,
      motorcycleNumberPlate: motorcycles.numberPlate,
      motorcycleOwnerUsername: users.username,
      motorcycleOwnerName: users.name,
    })
    .from(documents)
    .leftJoin(
      documentMotorcycles,
      eq(documentMotorcycles.documentId, documents.id),
    )
    .leftJoin(motorcycles, eq(documentMotorcycles.motorcycleId, motorcycles.id))
    .leftJoin(users, eq(motorcycles.userId, users.id))
    .where(
      or(
        isNull(documentMotorcycles.motorcycleId),
        eq(motorcycles.userId, user.id),
        eq(documents.ownerId, user.id),
      ),
    )
    .orderBy(desc(documents.createdAt));

  const docsMap = new Map<number, DocumentSummary>();
  const accessibleDocs = new Set<number>();

  docsRaw.forEach((row) => {
    let summary = docsMap.get(row.id);
    if (!summary) {
      summary = {
        id: row.id,
        title: row.title,
        filePath: row.filePath,
        previewPath: row.previewPath,
        isPrivate: Boolean(row.isPrivate),
        ownerId: row.ownerId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        uploadedBy: row.uploadedBy ?? null,
        motorcycles: [],
      };
      docsMap.set(row.id, summary);
    }

    const isOwner = summary.ownerId === user.id;

    if (
      row.motorcycleId === null ||
      row.motorcycleId === undefined ||
      userMotorcycleIdSet.has(row.motorcycleId) ||
      isOwner
    ) {
      accessibleDocs.add(row.id);
    }

    if (
      row.motorcycleId !== null &&
      row.motorcycleId !== undefined &&
      (isOwner || userMotorcycleIdSet.has(row.motorcycleId))
    ) {
      summary.motorcycles.push({
        id: row.motorcycleId,
        make: row.motorcycleMake ?? "",
        model: row.motorcycleModel ?? "",
        numberPlate: row.motorcycleNumberPlate ?? null,
        ownerUsername: resolveOwnerLabel(
          row.motorcycleOwnerUsername,
          row.motorcycleOwnerName,
        ),
      });
    }
  });

  const filteredDocuments = Array.from(docsMap.values()).filter((doc) =>
    accessibleDocs.has(doc.id) &&
    (!doc.isPrivate || doc.ownerId === user.id),
  );

  return data(
    {
      documents: filteredDocuments,
      motorcycles: allMotorcyclesRaw.map((moto) => ({
        id: moto.id,
        make: moto.make,
        model: moto.model,
        numberPlate: moto.numberPlate ?? null,
        ownerUsername: resolveOwnerLabel(moto.ownerUsername, moto.ownerName),
      })),
    },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, headers: sessionHeaders } = await requireUser(request);
  const db = await getDb();

  const formData = await request.formData();
  const intent = formData.get("intent");

  const respond = (body: unknown, init?: ResponseInit) =>
    data(body, {
      ...init,
      headers: mergeHeaders(sessionHeaders ?? {}),
    });

  const motorcycleRows = await db
    .select({ id: motorcycles.id, userId: motorcycles.userId })
    .from(motorcycles);

  const validMotorcycleIdSet = new Set<number>(
    motorcycleRows.map((row) => row.id),
  );

  const userMotorcycleIdSet = new Set<number>(
    motorcycleRows.filter((row) => row.userId === user.id).map((row) => row.id),
  );

  if (intent === "document-add") {
    const title = (formData.get("title") as string)?.trim();
    const file = formData.get("file");
    const motorcycleIdsRaw = formData.getAll("motorcycleIds") as string[];

    if (!title) {
      return respond(
        { success: false, message: "Titel ist erforderlich." },
        { status: 400 },
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return respond(
        { success: false, message: "PDF-Datei ist erforderlich." },
        { status: 400 },
      );
    }

    const sanitizedMotorcycleIds = motorcycleIdsRaw
      .map((id) => Number.parseInt(id))
      .filter((id) => !Number.isNaN(id));

    if (motorcycleIdsRaw.length !== sanitizedMotorcycleIds.length) {
      return respond(
        {
          success: false,
          message: "Ungültige Motorrad-Auswahl.",
        },
        { status: 400 },
      );
    }

    if (!sanitizedMotorcycleIds.every((id) => validMotorcycleIdSet.has(id))) {
      return respond(
        {
          success: false,
          message: "Ungültige Motorrad-Auswahl.",
        },
        { status: 400 },
      );
    }

    const isPrivateRaw = formData.get("isPrivate");
    const isPrivate =
      isPrivateRaw === "on" || isPrivateRaw === "true" || isPrivateRaw === "1";

    const fileExt = path.extname(file.name).toLowerCase();
    if (fileExt !== ".pdf") {
      return respond(
        { success: false, message: "Nur PDF-Dateien werden unterstützt." },
        { status: 400 },
      );
    }

    await ensureDocumentDirs();

    const uniqueName = `${randomUUID()}${fileExt}`;
    const serverPath = path.join(DOCUMENT_FILES_DIR, uniqueName);
    const publicPath = path.posix.join(DOCUMENT_FILES_PUBLIC_BASE, uniqueName);
    const previewFilename = `${path.parse(uniqueName).name}-preview.png`;
    const previewServerPath = path.join(DOCUMENT_PREVIEWS_DIR, previewFilename);
    const previewPublicPath = path.posix.join(
      DOCUMENT_PREVIEWS_PUBLIC_BASE,
      previewFilename,
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(serverPath, buffer);

    let previewPath: string | null = null;
    if (await generatePdfPreview(serverPath, previewServerPath)) {
      previewPath = previewPublicPath;
    }

    const newDocument: NewDocument = {
      title,
      filePath: publicPath,
      previewPath,
      uploadedBy: user.username ?? user.name,
      ownerId: user.id,
      isPrivate,
    };

    const inserted = await createDocument(db, newDocument);
    if (!inserted) {
      return respond(
        {
          success: false,
          message: "Dokument konnte nicht gespeichert werden.",
        },
        { status: 500 },
      );
    }

    if (sanitizedMotorcycleIds.length > 0) {
      const values: NewDocumentMotorcycle[] = sanitizedMotorcycleIds.map(
        (motorcycleId) => ({
          documentId: inserted.id,
          motorcycleId,
        }),
      );

      await attachDocumentToMotorcycles(db, values);
    }

    return respond({ success: true, intent: "document-add" }, { status: 200 });
  }

  if (intent === "document-edit") {
    const documentId = Number.parseInt(
      (formData.get("documentId") as string) ?? "",
    );
    const title = (formData.get("title") as string)?.trim();
    const file = formData.get("file");
    const motorcycleIdsRaw = formData.getAll("motorcycleIds") as string[];

    if (Number.isNaN(documentId)) {
      return respond(
        { success: false, message: "Dokument konnte nicht ermittelt werden." },
        { status: 400 },
      );
    }
    if (!title) {
      return respond(
        { success: false, message: "Titel ist erforderlich." },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!existing) {
      return respond(
        { success: false, message: "Dokument wurde nicht gefunden." },
        { status: 404 },
      );
    }

    let filePath = existing.filePath;
    let previewPath = existing.previewPath ?? null;

    const sanitizedMotorcycleIds = motorcycleIdsRaw
      .map((id) => Number.parseInt(id))
      .filter((id) => !Number.isNaN(id));

    if (motorcycleIdsRaw.length !== sanitizedMotorcycleIds.length) {
      return respond(
        {
          success: false,
          message: "Ungültige Motorrad-Auswahl.",
        },
        { status: 400 },
      );
    }

    const isPrivateRaw = formData.get("isPrivate");
    const isPrivate =
      isPrivateRaw === "on" || isPrivateRaw === "true" || isPrivateRaw === "1";

    const existingRelations = await db
      .select({ motorcycleId: documentMotorcycles.motorcycleId })
      .from(documentMotorcycles)
      .where(eq(documentMotorcycles.documentId, documentId));

    const existingMotorcycleIds = existingRelations
      .map((relation) => relation.motorcycleId)
      .filter((id): id is number => id !== null);

    if (existing.isPrivate && existing.ownerId !== user.id) {
      return respond(
        {
          success: false,
          message: "Dieses private Dokument kann nur vom Besitzer bearbeitet werden.",
        },
        { status: 403 },
      );
    }

    const canEdit = existing.isPrivate
      ? existing.ownerId === user.id
      : existingMotorcycleIds.length === 0 ||
        existingMotorcycleIds.some((id) => userMotorcycleIdSet.has(id));

    if (!canEdit) {
      return respond(
        {
          success: false,
          message: "Du kannst dieses Dokument nicht bearbeiten.",
        },
        { status: 403 },
      );
    }

    if (!sanitizedMotorcycleIds.every((id) => validMotorcycleIdSet.has(id))) {
      return respond(
        {
          success: false,
          message: "Ungültige Motorrad-Auswahl.",
        },
        { status: 400 },
      );
    }

    if (file instanceof File && file.size > 0) {
      const fileExt = path.extname(file.name).toLowerCase();
      if (fileExt !== ".pdf") {
        return respond(
          { success: false, message: "Nur PDF-Dateien werden unterstützt." },
          { status: 400 },
        );
      }

      await ensureDocumentDirs();
      const uniqueName = `${randomUUID()}${fileExt}`;
      const serverPath = path.join(DOCUMENT_FILES_DIR, uniqueName);
      const publicPath = path.posix.join(
        DOCUMENT_FILES_PUBLIC_BASE,
        uniqueName,
      );
      const previewFilename = `${path.parse(uniqueName).name}-preview.png`;
      const previewServerPath = path.join(
        DOCUMENT_PREVIEWS_DIR,
        previewFilename,
      );
      const previewPublicPath = path.posix.join(
        DOCUMENT_PREVIEWS_PUBLIC_BASE,
        previewFilename,
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(serverPath, buffer);

      // remove old file
      await deleteFileIfExists(resolvePublicFilePath(existing.filePath));
      if (existing.previewPath) {
        await deleteFileIfExists(resolvePublicFilePath(existing.previewPath));
      }

      filePath = publicPath;
      previewPath = (await generatePdfPreview(serverPath, previewServerPath))
        ? previewPublicPath
        : null;
    }

    await updateDocument(db, documentId, {
      title,
      filePath,
      previewPath,
      isPrivate,
      ownerId: isPrivate
        ? user.id
        : existing.ownerId ?? user.id,
      updatedAt: new Date().toISOString(),
    });

    await detachDocumentMotorcycles(db, documentId);

    if (sanitizedMotorcycleIds.length > 0) {
      const values: NewDocumentMotorcycle[] = sanitizedMotorcycleIds.map(
        (motorcycleId) => ({
          documentId,
          motorcycleId,
        }),
      );

      await attachDocumentToMotorcycles(db, values);
    }

    return respond({ success: true, intent: "document-edit" }, { status: 200 });
  }

  if (intent === "document-delete") {
    const documentId = Number.parseInt(
      (formData.get("documentId") as string) ?? "",
    );
    if (Number.isNaN(documentId)) {
      return respond(
        { success: false, message: "Dokument konnte nicht ermittelt werden." },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!existing) {
      return respond(
        { success: true, intent: "document-delete" },
        { status: 200 },
      );
    }

    const relations = await db
      .select({ motorcycleId: documentMotorcycles.motorcycleId })
      .from(documentMotorcycles)
      .where(eq(documentMotorcycles.documentId, documentId));

    const relationIds = relations
      .map((relation) => relation.motorcycleId)
      .filter((id): id is number => id !== null);

    if (existing.isPrivate && existing.ownerId !== user.id) {
      return respond(
        {
          success: false,
          message: "Dieses private Dokument kann nur vom Besitzer gelöscht werden.",
        },
        { status: 403 },
      );
    }

    const canDelete = existing.isPrivate
      ? existing.ownerId === user.id
      : relationIds.length === 0 ||
        relationIds.every((id) => userMotorcycleIdSet.has(id));

    if (!canDelete) {
      return respond(
        {
          success: false,
          message: "Du kannst dieses Dokument nicht löschen.",
        },
        { status: 403 },
      );
    }

    await deleteFileIfExists(resolvePublicFilePath(existing.filePath));
    if (existing.previewPath) {
      await deleteFileIfExists(resolvePublicFilePath(existing.previewPath));
    }

    await detachDocumentMotorcycles(db, documentId);

    await deleteDocument(db, documentId);

    return respond(
      { success: true, intent: "document-delete" },
      { status: 200 },
    );
  }

  return respond(
    { success: false, message: "Unbekannter Vorgang." },
    { status: 400 },
  );
}

export default function Documents() {
  const { documents: docs, motorcycles } = useLoaderData<LoaderData>();

  const sortedDocs = useMemo(
    () =>
      [...docs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [docs],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">
            Dokumentenarchiv
          </h1>
          <p className="text-muted-foreground text-sm">
            Lade PDF-Dokumente hoch und ordne sie deinen Motorrädern zu.
          </p>
        </div>
        <DocumentDialog motorcycles={motorcycles}>
          <Button>Neues Dokument</Button>
        </DocumentDialog>
      </div>

      <div className="grid gap-6">
        {sortedDocs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Keine Dokumente vorhanden</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lade dein erstes Dokument hoch, um wichtige Unterlagen zentral
                abzulegen.
              </p>
            </CardContent>
            <CardFooter>
              <DocumentDialog motorcycles={motorcycles}>
                <Button variant="outline">Dokument hochladen</Button>
              </DocumentDialog>
            </CardFooter>
          </Card>
        ) : (
          <DocumentList
            documents={sortedDocs.map((doc) => ({
              id: doc.id,
              title: doc.title,
              filePath: doc.filePath,
              previewPath: doc.previewPath,
              isPrivate: doc.isPrivate,
              createdAt: doc.createdAt,
              subtitle: (() => {
                const assignmentLabel =
                  doc.motorcycles.length === 0
                    ? "Alle Motorräder"
                    : doc.motorcycles
                        .map((moto) => {
                          const base = [
                            `${moto.make} ${moto.model}`.trim(),
                            moto.numberPlate ? `(${moto.numberPlate})` : null,
                            moto.ownerUsername ? `• ${moto.ownerUsername}` : null,
                          ].filter(Boolean);
                          return base.join(" ");
                        })
                        .join(", ");

                if (doc.isPrivate) {
                  return `Privat • Zugeordnet zu: ${assignmentLabel}`;
                }

                return `Zugeordnet zu: ${assignmentLabel}`;
              })(),
              motorcycleIds: doc.motorcycles.map((m) => m.id),
              uploadedBy: doc.uploadedBy ?? null,
            }))}
            renderActions={(doc) => (
              <DocumentDialog
                motorcycles={motorcycles}
                document={{
                  id: doc.id,
                  title: doc.title,
                  filePath: doc.filePath,
                  previewPath: doc.previewPath ?? null,
                  motorcycleIds: doc.motorcycleIds ?? [],
                  isPrivate: doc.isPrivate ?? false,
                }}
              >
                <Button size="sm" variant="secondary" className="flex-1">
                  Bearbeiten
                </Button>
              </DocumentDialog>
            )}
          />
        )}
      </div>
    </div>
  );
}
