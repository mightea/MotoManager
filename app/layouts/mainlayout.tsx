import { Outlet } from "react-router";
import Header from "~/components/Header";

export default function MainLayout() {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden md:max-w-lg lg:max-w-xl transition-colors duration-300">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}
