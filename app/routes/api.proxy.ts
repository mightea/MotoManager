import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { getBackendUrl } from "~/config";

/**
 * Generic proxy for all /api/* requests to the backend.
 * This avoids CORS issues in production by handling the request server-side.
 */
async function handleProxyRequest({ request, params }: LoaderFunctionArgs | ActionFunctionArgs) {
  const backendUrl = getBackendUrl();
  const url = new URL(request.url);
  
  // Extract the path after /api/
  const path = params["*"];
  const targetUrl = `${backendUrl}/api/${path}${url.search}`;

  console.log(`[Proxy] ${request.method} ${url.pathname} -> ${targetUrl}`);

  const headers = new Headers(request.headers);
  // Remove host header to avoid issues with backend
  headers.delete("host");
  // Ensure we don't pass along compression headers if we can't handle them easily
  headers.delete("accept-encoding");

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.arrayBuffer() : undefined,
      // @ts-ignore - duplex is needed for streaming bodies in some node versions
      duplex: "half",
    });

    // Strip some headers that might cause issues
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Proxy Error] Failed to fetch ${targetUrl}:`, error);
    return new Response(JSON.stringify({ 
      error: "Backend communication failed", 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const loader = handleProxyRequest;
export const action = handleProxyRequest;
