import { Suspense } from "react";
import { Outlet } from "react-router";
import { Header } from "~/components/header";
import { Toaster } from "~/components/ui/toaster";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={<div className="h-20 border-b"></div>}>
        <Header />
      </Suspense>
      <main className="container mx-auto p-4 py-8 md:p-8 flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
