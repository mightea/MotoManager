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
  const path = params["*"] || "";
  const targetUrl = `${backendUrl}/api/${path}${url.search}`;

  console.info(`[Proxy] ${request.method} ${url.pathname}${url.search} -> ${targetUrl}`);

  const headers = new Headers(request.headers);
  
  // Update Host header to match target
  try {
    const targetUrlObj = new URL(targetUrl);
    headers.set("Host", targetUrlObj.host);
  } catch {
    // Ignore invalid URL errors here, fetch will catch them
  }

  // Remove headers that might cause issues with proxying
  headers.delete("content-length");
  headers.delete("accept-encoding");
  headers.delete("connection");

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.clone().arrayBuffer() : undefined,
      // @ts-ignore
      duplex: "half",
      redirect: "follow",
    });

    console.info(`[Proxy] Response: ${response.status} ${response.statusText}`);

    // Create a new response to allow modifying headers
    const responseHeaders = new Headers(response.headers);
    // Don't forward these
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("set-cookie"); // Use our own session management

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Proxy Error] Failed to fetch ${targetUrl}:`, error);
    return new Response(JSON.stringify({ 
      error: "Backend communication failed", 
      message: error instanceof Error ? error.message : String(error),
      target: targetUrl 
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const loader = handleProxyRequest;
export const action = handleProxyRequest;
