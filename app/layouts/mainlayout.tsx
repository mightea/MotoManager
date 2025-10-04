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
        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
