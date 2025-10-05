import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import {
  destroySessionFromRequest,
  mergeHeaders,
} from "~/services/auth.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method.toUpperCase() !== "POST") {
    throw new Response("Method Not Allowed", { status: 405 });
  }

  const { headers } = await destroySessionFromRequest(request);
  const response = redirect("/auth/login");
  mergeHeaders(headers ?? {}).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
