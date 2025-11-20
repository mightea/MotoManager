import { Form, Link, useLocation } from "react-router";
import { Bike, LogOut, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "~/db/schema";
import clsx from "clsx";
import { useState } from "react";

export function Header({ user }: { user: User | null }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Übersicht", href: "/" },
    { label: "Dokumente", href: "/documents" },
    { label: "Einstellungen", href: "/settings" },
  ];

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <header className="w-full max-w-7xl rounded-2xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/90">
        <div className="flex items-center justify-between p-3">
          {/* Logo Section */}
          <div className="flex items-center gap-3 pl-2">
            <Link to="/" className="group flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
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

          {/* Desktop Center Navigation */}
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
              <>
                <div className="hidden items-center gap-3 rounded-full bg-gray-50 py-1.5 pl-1.5 pr-4 dark:bg-navy-900/50 md:flex">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-navy-700 dark:text-blue-400">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground dark:text-gray-200">
                    {user.username}
                  </span>
                </div>
                
                <Form action="/auth/logout" method="post" className="hidden md:block">
                  <button
                    type="submit"
                    className="grid h-10 w-10 place-items-center rounded-xl text-secondary transition-colors hover:bg-red-50 hover:text-red-600 dark:text-navy-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </Form>
              </>
            ) : (
              <Link
                to="/auth/login"
                className="hidden rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark md:block"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="grid h-10 w-10 place-items-center rounded-xl text-secondary transition-colors hover:bg-gray-100 md:hidden dark:text-navy-400 dark:hover:bg-navy-700"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-100 p-4 md:hidden dark:border-navy-700">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                 const isActive = location.pathname === item.href;
                 return (
                  <Link
                    key={item.label}
                    to={item.href === "/documents" || item.href === "/settings" ? "#" : item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400"
                        : "text-secondary hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                 );
              })}
              
              {user && (
                 <div className="mt-4 border-t border-gray-100 pt-4 dark:border-navy-700">
                    <div className="mb-4 flex items-center gap-3 px-2">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-base font-bold text-primary dark:bg-navy-700 dark:text-blue-400">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground dark:text-gray-200">
                          {user.username}
                        </span>
                    </div>
                    <Form action="/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-5 w-5" />
                        Logout
                      </button>
                    </Form>
                 </div>
              )}

              {!user && (
                 <Link
                    to="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-4 block w-full rounded-lg bg-primary px-4 py-3 text-center text-base font-medium text-white hover:bg-primary-dark"
                 >
                    Login
                 </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}