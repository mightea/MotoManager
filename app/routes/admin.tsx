import { Outlet } from "react-router";
import type { Route } from "./+types/admin";
import { data } from "react-router";
import { mergeHeaders, requireAdmin, requireUser } from "~/services/auth.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Adminbereich" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  requireAdmin(user);

  return data(
    { user },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export default function AdminLayout() {
  return <Outlet />;
}

