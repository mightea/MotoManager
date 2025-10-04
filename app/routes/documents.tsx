import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import db from "~/db";
import {
  documents,
  documentMotorcycles,
  motorcycles,
  type Motorcycle,
  type NewDocument,
  type NewDocumentMotorcycle,
} from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { data, Link, useLoaderData } from "react-router";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import DocumentDialog, { type DocumentDialogData } from "~/components/document-dialog";

const DOCUMENTS_DIR = path.join(process.cwd(), "public", "documents");
const DOCUMENTS_PUBLIC_BASE = "/documents";

function resolvePublicFilePath(relativePath: string) {
  return path.join(process.cwd(), "public", relativePath.replace(/^\/+/, ""));
}

interface DocumentSummary {
  id: number;
  title: string;
  filePath: string;
  previewPath: string | null;
  createdAt: string;
  updatedAt: string;
  motorcycles: Array<{
    id: number;
    make: string;
    model: string;
    numberPlate: string | null;
  }>;
}

type LoaderData = {
  documents: DocumentSummary[];
  motorcycles: Motorcycle[];
};

async function ensureDocumentsDir() {
  try {
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
  } catch (error) {
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
  outputPath: string
): Promise<boolean> {
  try {
    await execFileAsync("sips", ["-s", "format", "png", pdfPath, "--out", outputPath]);
    return true;
  } catch (error) {
    console.warn("PDF preview generation failed", error);
    await deleteFileIfExists(outputPath);
    return false;
  }
}

export async function loader({}: LoaderFunctionArgs): Promise<LoaderData> {
  const docsRaw = await db
    .select({
      id: documents.id,
      title: documents.title,
      filePath: documents.filePath,
      previewPath: documents.previewPath,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      motorcycleId: documentMotorcycles.motorcycleId,
      motorcycleMake: motorcycles.make,
      motorcycleModel: motorcycles.model,
      motorcycleNumberPlate: motorcycles.numberPlate,
    })
    .from(documents)
    .leftJoin(
      documentMotorcycles,
      eq(documentMotorcycles.documentId, documents.id)
    )
    .leftJoin(motorcycles, eq(documentMotorcycles.motorcycleId, motorcycles.id))
    .orderBy(desc(documents.createdAt));

  const docsMap = new Map<number, DocumentSummary>();

  docsRaw.forEach((row) => {
    let summary = docsMap.get(row.id);
    if (!summary) {
      summary = {
        id: row.id,
        title: row.title,
        filePath: row.filePath,
        previewPath: row.previewPath,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        motorcycles: [],
      };
      docsMap.set(row.id, summary);
    }
    if (row.motorcycleId !== null && row.motorcycleId !== undefined) {
      summary.motorcycles.push({
        id: row.motorcycleId,
        make: row.motorcycleMake ?? "",
        model: row.motorcycleModel ?? "",
        numberPlate: row.motorcycleNumberPlate ?? null,
      });
    }
  });

  const allMotorcycles = await db.query.motorcycles.findMany();

  return {
    documents: Array.from(docsMap.values()),
    motorcycles: allMotorcycles,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "document-add") {
    const title = (formData.get("title") as string)?.trim();
    const file = formData.get("file");
    const motorcycleIdsRaw = formData.getAll("motorcycleIds") as string[];

    if (!title) {
      return data({ success: false, message: "Titel ist erforderlich." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return data(
        { success: false, message: "PDF-Datei ist erforderlich." },
        { status: 400 }
      );
    }

    const fileExt = path.extname(file.name).toLowerCase();
    if (fileExt !== ".pdf") {
      return data(
        { success: false, message: "Nur PDF-Dateien werden unterstützt." },
        { status: 400 }
      );
    }

    await ensureDocumentsDir();

    const uniqueName = `${randomUUID()}${fileExt}`;
    const serverPath = path.join(DOCUMENTS_DIR, uniqueName);
    const publicPath = path.posix.join(DOCUMENTS_PUBLIC_BASE, uniqueName);
    const previewFilename = `${path.parse(uniqueName).name}-preview.png`;
    const previewServerPath = path.join(DOCUMENTS_DIR, previewFilename);
    const previewPublicPath = path.posix.join(
      DOCUMENTS_PUBLIC_BASE,
      previewFilename
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
    };

    const [inserted] = await db
      .insert(documents)
      .values(newDocument)
      .returning();

    if (motorcycleIdsRaw.length > 0) {
      const values: NewDocumentMotorcycle[] = motorcycleIdsRaw
        .map((id) => Number.parseInt(id))
        .filter((id) => !Number.isNaN(id))
        .map((motorcycleId) => ({
          documentId: inserted.id,
          motorcycleId,
        }));

      if (values.length > 0) {
        await db.insert(documentMotorcycles).values(values);
      }
    }

    return data({ success: true, intent: "document-add" }, { status: 200 });
  }

  if (intent === "document-edit") {
    const documentId = Number.parseInt((formData.get("documentId") as string) ?? "");
    const title = (formData.get("title") as string)?.trim();
    const file = formData.get("file");
    const motorcycleIdsRaw = formData.getAll("motorcycleIds") as string[];

    if (Number.isNaN(documentId)) {
      return data(
        { success: false, message: "Dokument konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }
    if (!title) {
      return data({ success: false, message: "Titel ist erforderlich." }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!existing) {
      return data({ success: false, message: "Dokument wurde nicht gefunden." }, { status: 404 });
    }

    let filePath = existing.filePath;
    let previewPath = existing.previewPath ?? null;

    if (file instanceof File && file.size > 0) {
      const fileExt = path.extname(file.name).toLowerCase();
      if (fileExt !== ".pdf") {
        return data(
          { success: false, message: "Nur PDF-Dateien werden unterstützt." },
          { status: 400 }
        );
      }

      await ensureDocumentsDir();
      const uniqueName = `${randomUUID()}${fileExt}`;
      const serverPath = path.join(DOCUMENTS_DIR, uniqueName);
      const publicPath = path.posix.join(DOCUMENTS_PUBLIC_BASE, uniqueName);
      const previewFilename = `${path.parse(uniqueName).name}-preview.png`;
      const previewServerPath = path.join(DOCUMENTS_DIR, previewFilename);
      const previewPublicPath = path.posix.join(
        DOCUMENTS_PUBLIC_BASE,
        previewFilename
      );
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(serverPath, buffer);

      // remove old file
      await deleteFileIfExists(resolvePublicFilePath(existing.filePath));
      if (existing.previewPath) {
        await deleteFileIfExists(resolvePublicFilePath(existing.previewPath));
      }

      filePath = publicPath;
      previewPath =
        (await generatePdfPreview(serverPath, previewServerPath))
          ? previewPublicPath
          : null;
    }

    await db
      .update(documents)
      .set({
        title,
        filePath,
        previewPath,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(documents.id, documentId));

    await db
      .delete(documentMotorcycles)
      .where(eq(documentMotorcycles.documentId, documentId));

    if (motorcycleIdsRaw.length > 0) {
      const values: NewDocumentMotorcycle[] = motorcycleIdsRaw
        .map((id) => Number.parseInt(id))
        .filter((id) => !Number.isNaN(id))
        .map((motorcycleId) => ({
          documentId,
          motorcycleId,
        }));

      if (values.length > 0) {
        await db.insert(documentMotorcycles).values(values);
      }
    }

    return data({ success: true, intent: "document-edit" }, { status: 200 });
  }

  if (intent === "document-delete") {
    const documentId = Number.parseInt((formData.get("documentId") as string) ?? "");
    if (Number.isNaN(documentId)) {
      return data(
        { success: false, message: "Dokument konnte nicht ermittelt werden." },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!existing) {
      return data({ success: true, intent: "document-delete" }, { status: 200 });
    }

    await deleteFileIfExists(resolvePublicFilePath(existing.filePath));
    if (existing.previewPath) {
      await deleteFileIfExists(resolvePublicFilePath(existing.previewPath));
    }

    await db.delete(documents).where(eq(documents.id, documentId));

    return data({ success: true, intent: "document-delete" }, { status: 200 });
  }

  return data({ success: false, message: "Unbekannter Vorgang." }, { status: 400 });
}

export default function Documents() {
  const { documents: docs, motorcycles } =
    useLoaderData<LoaderData>();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Dokumentenarchiv</h1>
          <p className="text-muted-foreground text-sm">
            Lade PDF-Dokumente hoch und ordne sie deinen Motorrädern zu.
          </p>
        </div>
        <DocumentDialog motorcycles={motorcycles}>
          <Button>
            Neues Dokument
          </Button>
        </DocumentDialog>
      </div>

      <div className="grid gap-4">
        {docs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Keine Dokumente vorhanden</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lade dein erstes Dokument hoch, um wichtige Unterlagen zentral abzulegen.
              </p>
            </CardContent>
            <CardFooter>
              <DocumentDialog motorcycles={motorcycles}>
                <Button variant="outline">Dokument hochladen</Button>
              </DocumentDialog>
            </CardFooter>
          </Card>
        ) : (
          docs.map((doc) => {
            const appliesToAll = doc.motorcycles.length === 0;
            const assignedLabel = appliesToAll
              ? "Alle Motorräder"
              : doc.motorcycles
                  .map((moto) => `${moto.make} ${moto.model}${moto.numberPlate ? ` (${moto.numberPlate})` : ""}`)
                  .join(", ");

            const displayDate = format(new Date(doc.createdAt), "PPP", { locale: de });

            return (
              <Card key={doc.id} className="overflow-hidden">
                <div className="grid gap-4 p-4 md:grid-cols-[260px_1fr]">
                  <div className="rounded-md border bg-muted/40 flex items-center justify-center p-3">
                    <img
                      src={doc.previewPath ?? "/images/pdf-placeholder.svg"}
                      alt={`Vorschau für ${doc.title}`}
                      className="h-48 w-full object-contain rounded"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-semibold text-foreground">{doc.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        Hochgeladen am {displayDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Zugeordnet zu</p>
                      <p className="text-sm text-muted-foreground">{assignedLabel}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={doc.filePath} target="_blank" rel="noreferrer">
                          PDF öffnen
                        </Link>
                      </Button>
                      <DocumentDialog
                        motorcycles={motorcycles}
                        document={{
                          ...doc,
                          motorcycleIds: doc.motorcycles.map((m) => m.id),
                        }}
                      >
                        <Button size="sm" variant="secondary">
                          Bearbeiten
                        </Button>
                      </DocumentDialog>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
