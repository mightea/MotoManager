import { Outlet, data } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { requireUser } from "~/services/auth.server";
import { mergeHeaders } from "~/services/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  return data({ user }, { headers: mergeHeaders(headers) });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <div className="min-h-screen bg-background font-sans antialiased dark:bg-navy-950">
      <Header user={user} />
      <main className="flex-1 pt-24 relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
