import { redirect, type LoaderFunctionArgs } from "react-router";
import { getBackendAssetUrl } from "~/utils/backend";

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  const backendUrl = getBackendAssetUrl(`/data/previews/${filename}`);
  
  if (!backendUrl) {
    throw new Response("Not Found", { status: 404 });
  }

  return redirect(backendUrl);
}
