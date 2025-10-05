import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Outlet />
    </div>
  );
}
