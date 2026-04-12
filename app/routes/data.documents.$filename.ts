import { redirect, type LoaderFunctionArgs } from "react-router";
import { getBackendAssetUrl } from "~/utils/backend";

export async function clientLoader({ params, request }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  
  const backendAssetUrl = getBackendAssetUrl(`/data/documents/${filename}`);
  if (!backendAssetUrl) {
    throw new Response("Not Found", { status: 404 });
  }

  const redirectUrl = new URL(backendAssetUrl);
  if (token) {
    redirectUrl.searchParams.set("token", token);
  }

  return redirect(redirectUrl.toString());
}
