import { fetchFromBackend } from "~/utils/backend";
import { cachedFetch, invalidatePrefix } from "~/utils/request-cache";

// The `/documents` payload ({ docs, allMotorcycles, assignments }) is read by both
// the documents route and each motorcycle's documents tab — cache it so those
// navigations share one request. `invalidateDocuments()` is called after every
// document mutation.
const DOCUMENTS_TTL_MS = 60_000;

export function getDocumentsPayload(token: string) {
  return cachedFetch(`documents:${token}`, DOCUMENTS_TTL_MS, () =>
    fetchFromBackend<any>("/documents", {}, token),
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
    const response = await fetchFromBackend<{ documents: any[] }>("/documents", {}, token);
    return response.documents;
}

export async function saveDocumentFile(file: File, token: string) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetchFromBackend<{ document: any }>("/documents", {
        method: "POST",
        body: formData,
    }, token);
    return response.document;
}

export async function deleteDocumentFiles(docId: number, token: string) {
    return fetchFromBackend<any>(`/documents/${docId}`, {
        method: "DELETE",
    }, token);
}

export async function regenerateAllDocumentPreviews(token: string) {
    const result = await fetchFromBackend<any>("/admin/regenerate-previews", {
        method: "POST",
    }, token);
    invalidateDocuments();
    return result;
}
