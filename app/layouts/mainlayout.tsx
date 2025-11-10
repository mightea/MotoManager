import { Suspense } from "react";
import { Outlet } from "react-router";
import { GlobalLoadingIndicator } from "~/components/global-loading-indicator";
import { Header } from "~/components/header";
import { Toaster } from "~/components/ui/toaster";

export default function MainLayout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <GlobalLoadingIndicator />
      <Header />
      <main className="flex-1 w-full">
        <Suspense fallback={<MainContentFallback />}>
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}

function MainContentFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
      <div className="space-y-6">
        <div className="h-8 w-2/3 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted/60 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-2xl bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
