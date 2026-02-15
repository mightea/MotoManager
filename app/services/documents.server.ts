import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

const execFileAsync = promisify(execFile);

// Re-export constants if needed by client, but usually these are used for validation which can be shared or duplicated
// For now, let's keep validation logic where it is or move it to a shared utils file if it doesn't use node modules.
// The loader in documents.tsx uses these utils, so we might need to extract them to a shared util if we want to use them in client AND server.
// However, the task is to move dangerous imports.

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

export function isPdfFile(file: File) {
    const mimeType = file.type?.toLowerCase() ?? "";
    const name = file.name?.toLowerCase() ?? "";
    return mimeType === "application/pdf" || name.endsWith(".pdf");
}

export function isImageFile(file: File) {
    const mimeType = file.type?.toLowerCase() ?? "";
    if (mimeType.startsWith("image/")) {
        return true;
    }
    const ext = path.extname(file.name || "").toLowerCase();
    return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
}

export function getFileCategory(file: File): "pdf" | "image" | null {
    if (isPdfFile(file)) return "pdf";
    if (isImageFile(file)) return "image";
    return null;
}

async function deleteFileIfExists(filePath: string) {
    try {
        await fs.unlink(filePath);
    } catch {
        // Ignore error if file doesn't exist
    }
}

async function generatePdfPreview(
    pdfPath: string,
    outputPath: string,
): Promise<boolean> {
    try {
        if (process.platform === "darwin") {
            await execFileAsync("sips", [
                "-s",
                "format",
                "png",
                pdfPath,
                "--out",
                outputPath,
            ]);
        } else {
            // Linux (Docker) - use pdftoppm (poppler-utils)
            // pdftoppm adds extension automatically, so we remove it from outputPath
            const outputPrefix = outputPath.replace(/\.png$/i, "");
            await execFileAsync("pdftoppm", [
                "-png",
                "-f",
                "1",
                "-l",
                "1",
                "-singlefile",
                pdfPath,
                outputPrefix,
            ]);
        }
        return true;
    } catch (error) {
        console.warn("PDF preview generation failed", error);
        await deleteFileIfExists(outputPath);
        return false;
    }
}

export async function saveDocumentFile(file: File) {
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

export async function deleteDocumentFiles(filePath: string, previewPath: string | null) {
    try {
        // filePath is stored as /data/documents/... in DB, need to resolve to absolute path
        // The component logic did: path.join(process.cwd(), doc.filePath.replace("/data/documents", "data/documents"));

        // We can just strip the leading slash if it exists
        const relativeFilePath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
        const fullFilePath = path.join(process.cwd(), relativeFilePath);

        await fs.unlink(fullFilePath);

        if (previewPath) {
            const relativePreviewPath = previewPath.startsWith("/") ? previewPath.substring(1) : previewPath;
            const fullPreviewPath = path.join(process.cwd(), relativePreviewPath);
            await fs.unlink(fullPreviewPath);
        }
    } catch (e) {
        console.error("Error deleting files:", e);
        // Be robust, maybe one file was already gone
    }
}

import { eq } from "drizzle-orm";
import { documents } from "~/db/schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "~/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export async function regenerateAllDocumentPreviews(db: Database) {
    const allDocs = await db.select().from(documents);
    let count = 0;

    const previewsDir = path.join(process.cwd(), "data", "previews");
    await fs.mkdir(previewsDir, { recursive: true });

    for (const doc of allDocs) {
        // Only process likely PDFs based on extension or mime if we had it.
        // We only have filePath.
        // Check for .pdf extension (case insensitive)
        if (!doc.filePath.toLowerCase().endsWith(".pdf")) {
            continue;
        }

        const relativeFilePath = doc.filePath.startsWith("/") ? doc.filePath.substring(1) : doc.filePath;
        const absoluteFilePath = path.join(process.cwd(), relativeFilePath);

        try {
            // Check if file exists
            await fs.access(absoluteFilePath);

            // Generate new preview
            const previewName = `${uuidv4()}.png`;
            const previewFilePath = path.join(previewsDir, previewName);
            const success = await generatePdfPreview(absoluteFilePath, previewFilePath);

            if (success) {
                // Delete old preview if it exists
                if (doc.previewPath) {
                    const oldRelative = doc.previewPath.startsWith("/") ? doc.previewPath.substring(1) : doc.previewPath;
                    const oldAbsolute = path.join(process.cwd(), oldRelative);
                    await deleteFileIfExists(oldAbsolute);
                }

                // Update DB
                const newWebPath = `/data/previews/${previewName}`;
                await db.update(documents)
                    .set({ previewPath: newWebPath })
                    .where(eq(documents.id, doc.id));

                count++;
            }
        } catch (e) {
            console.error(`Failed to regenerate preview for doc ${doc.id}:`, e);
            // Continue with next doc
        }
    }
    return count;
}
