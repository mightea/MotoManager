import { data } from "react-router";
import type { Route } from "./+types/api.auth.passkey.$action";
import { requireUser, createSession } from "~/services/auth.server";
import { fetchFromBackend } from "~/utils/backend.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  const action = params.action;

  if (action === "register-options") {
    const { token } = await requireUser(request);
    const result = await fetchFromBackend<any>("/auth/passkey/register-options", {}, token);
    return data(result);
  }

  if (action === "login-options") {
    const url = new URL(request.url);
    const username = url.searchParams.get("username") || undefined;
    const result = await fetchFromBackend<any>(`/auth/passkey/login-options${username ? `?username=${username}` : ""}`);
    return data(result);
  }

  throw new Response("Not Found", { status: 404 });
}

export async function action({ params, request }: Route.ActionArgs) {
  const action = params.action;
  const body = await request.json();

  if (action === "register-verify") {
    const { token } = await requireUser(request);
    const result = await fetchFromBackend<any>("/auth/passkey/register-verify", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
    return data(result);
  }

  if (action === "login-verify") {
    const response = await fetchFromBackend<{ verified: boolean; token?: string }>("/auth/passkey/login-verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
    
    if (response.verified && response.token) {
      const { headers } = await createSession(response.token);
      return data({ verified: true }, { headers });
    }
    
    return data({ verified: false }, { status: 400 });
  }

  throw new Response("Not Found", { status: 404 });
}
