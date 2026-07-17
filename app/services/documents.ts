import { fetchFromBackend } from "~/utils/backend";
import { cachedFetch, invalidatePrefix } from "~/utils/request-cache";
import {
  type Document,
  type DocumentMotorcycle,
} from "~/types/db";

// The `/documents` payload ({ docs, allMotorcycles, assignments }) is read by both
// the documents route and each motorcycle's documents tab — cache it so those
// navigations share one request. `invalidateDocuments()` is called after every
// document mutation.
const DOCUMENTS_TTL_MS = 60_000;

/**
 * One `/documents` docs row: the document plus its assigned motorcycle ids.
 * `updatedAt` stays optional so the narrower `DocumentSummary` card shape
 * remains compatible with these rows.
 */
export type DocumentListItem = Omit<Document, "updatedAt"> & {
  updatedAt?: string;
  motorcycleIds?: number[];
};

/** Shape of the `/documents` response. */
export interface DocumentsPayload {
  docs: DocumentListItem[];
  allMotorcycles: {
    id: number;
    userId: number;
    make: string;
    model: string;
    ownerName: string;
  }[];
  assignments: DocumentMotorcycle[];
}

export function getDocumentsPayload(token: string) {
  return cachedFetch(`documents:${token}`, DOCUMENTS_TTL_MS, () =>
    fetchFromBackend<DocumentsPayload>("/documents", {}, token),
  );
}

export function invalidateDocuments() {
  invalidatePrefix("documents:");
}

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
    const name = file.name?.toLowerCase() ?? "";
    return name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp");
}

export function getFileCategory(file: File): "pdf" | "image" | null {
    if (isPdfFile(file)) return "pdf";
    if (isImageFile(file)) return "image";
    return null;
}

export async function listDocuments(token: string) {
    const response = await fetchFromBackend<{ documents: Document[] }>("/documents", {}, token);
    return response.documents;
}

export async function saveDocumentFile(file: File, token: string) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetchFromBackend<{ document: Document }>("/documents", {
        method: "POST",
        body: formData,
    }, token);
    return response.document;
}

export async function deleteDocumentFiles(docId: number, token: string) {
    return fetchFromBackend<{ message: string }>(`/documents/${docId}`, {
        method: "DELETE",
    }, token);
}

export async function regenerateAllDocumentPreviews(token: string) {
    const result = await fetchFromBackend<{ message: string; docCount: number; motoCount: number }>("/admin/regenerate-previews", {
        method: "POST",
    }, token);
    invalidateDocuments();
    return result;
}
