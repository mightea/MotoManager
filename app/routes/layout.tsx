import { Outlet, data, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { requireUser } from "~/services/auth.server";
import { mergeHeaders } from "~/services/auth.server";
import clsx from "clsx";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  return data({ user }, { headers: mergeHeaders(headers) });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const location = useLocation();
  const isMotorcycleDetail = location.pathname.startsWith("/motorcycle/");

  return (
    <div className="min-h-screen bg-background font-sans antialiased dark:bg-navy-950">
      <Header user={user} />
      <main
        className={clsx(
          "flex-1 relative z-0",
          // On mobile detail pages header is non-fixed (in document flow) → no top padding
          // On desktop or non-detail pages header is fixed → need pt-24
          isMotorcycleDetail ? "pt-0 md:pt-24" : "pt-24"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
