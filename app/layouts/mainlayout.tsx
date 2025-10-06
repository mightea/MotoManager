import { Suspense } from "react";
import { Outlet } from "react-router";
import { Header } from "~/components/header";
import { Toaster } from "~/components/ui/toaster";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense fallback={<div className="h-20" />}
      >
        <Header />
      </Suspense>
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
