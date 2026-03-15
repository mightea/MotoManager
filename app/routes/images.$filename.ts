import { redirect, type LoaderFunctionArgs } from "react-router";
import { getBackendAssetUrl } from "~/utils/backend";

export async function clientLoader({ params, request }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const backendUrl = getBackendAssetUrl(`/images/${filename}${url.search}`);
  
  if (!backendUrl) {
    throw new Response("Not Found", { status: 404 });
  }

  return redirect(backendUrl);
}
