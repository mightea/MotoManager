import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import {
  destroySessionFromRequest,
} from "~/services/auth";

export async function clientAction({ request }: Route.ClientActionArgs) {
  if (request.method.toUpperCase() !== "POST") {
    throw new Response("Method Not Allowed", { status: 405 });
  }

  await destroySessionFromRequest(request);
  return redirect("/auth/login");
}
