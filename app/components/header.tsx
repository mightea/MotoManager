import { Form, Link, useLocation } from "react-router";
import { Bike, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "~/db/schema";
import clsx from "clsx";

export function Header({ user }: { user: User | null }) {
  const location = useLocation();

  const navItems = [
    { label: "Übersicht", href: "/" },
    { label: "Dokumente", href: "/documents" }, // Placeholder
    { label: "Einstellungen", href: "/settings" }, // Placeholder
  ];

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <header className="w-full max-w-7xl rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-xl backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/90">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-3 pl-2">
            <Link to="/" className="group flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 dark:bg-navy-700 dark:text-blue-400">
                <Bike className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary dark:text-navy-400">
                  MotoManager
                </span>
                <span className="text-lg font-bold leading-none tracking-tight text-foreground dark:text-white">
                  Garage Cockpit
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:block">
            <ul className="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-navy-900/50">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.label}>
                    <Link
                      to={item.href === "/documents" || item.href === "/settings" ? "#" : item.href}
                      className={clsx(
                        "block rounded-full px-5 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-white shadow-sm dark:bg-primary-light dark:text-navy-900"
                          : "text-secondary hover:text-foreground dark:text-navy-400 dark:hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3 pr-2">
            <ThemeToggle />
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 rounded-full bg-gray-50 py-1.5 pl-1.5 pr-4 dark:bg-navy-900/50 sm:flex">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-navy-700 dark:text-blue-400">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground dark:text-gray-200">
                    {user.username}
                  </span>
                </div>
                
                <Form action="/auth/logout" method="post">
                  <button
                    type="submit"
                    className="grid h-10 w-10 place-items-center rounded-xl text-secondary transition-colors hover:bg-red-50 hover:text-red-600 dark:text-navy-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </Form>
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}