import { fetchFromBackend } from "~/utils/backend";

export async function processImageUpload(file: File, token: string): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetchFromBackend<{ url: string }>("/images/upload", {
        method: "POST",
        body: formData,
    }, token);

    return response.url;
}
