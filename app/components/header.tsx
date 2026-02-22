import { Form, Link, useLocation } from "react-router";
import { LogOut, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "~/db/schema";
import clsx from "clsx";
import { useEffect, useState } from "react";

export function Header({ user }: { user: User | null }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const isMotorcycleDetail = location.pathname.startsWith("/motorcycle/");

  const navItems = [
    { label: "Übersicht", href: "/" },
    { label: "Statistik", href: "/fleet-stats" },
    { label: "Dokumente", href: "/documents" },
    { label: "Einstellungen", href: "/settings" },
  ];

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Scroll-based show/hide — desktop motorcycle detail only
  useEffect(() => {
    if (!isMotorcycleDetail || typeof window === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsHidden(false);
      return;
    }

    // On mobile, the header is non-fixed and scrolls with content → no hide logic needed
    if (window.innerWidth < 768) {
      setIsHidden(false);
      return;
    }

    let lastScrollY = window.scrollY;
    let frame: number | null = null;

    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY;

        if (currentY <= 80) {
          setIsHidden(false);
        } else if (delta > 6) {
          setIsHidden(true);
        } else if (delta < -6) {
          setIsHidden(false);
        }

        lastScrollY = currentY;
        frame = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMotorcycleDetail]);

  // CSS variable for desktop detail header offset
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (isMotorcycleDetail && window.innerWidth >= 768) {
      root.style.setProperty("--app-header-offset", isHidden ? "0px" : "96px");
    } else {
      root.style.removeProperty("--app-header-offset");
    }

    return () => { root.style.removeProperty("--app-header-offset"); };
  }, [isMotorcycleDetail, isHidden]);

  return (
    <div
      className={clsx(
        "z-40 flex justify-center pointer-events-none",
        // On mobile motorcycle detail: non-fixed, scrolls with page naturally
        isMotorcycleDetail
          ? "relative md:fixed md:top-4 md:px-4 md:left-0 md:right-0 transition-transform duration-300 ease-out"
          : "fixed top-0 md:top-4 left-0 right-0 md:px-4 transition-transform duration-300 ease-out",
        // Hide transform only on desktop motorcycle detail
        isMotorcycleDetail && isHidden && "md:-translate-y-full"
      )}
    >
      <header className="relative w-full max-w-7xl overflow-hidden rounded-b-2xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/90 pointer-events-auto">
        {/* Motorsport Stripe Accent */}
        <div className="absolute left-0 right-0 top-0 h-2.5 bg-gradient-to-r from-[#008AC9] via-[#2B115A] to-[#F11A22]" />

        <div className="flex items-center justify-between p-3 pt-5">
          {/* Logo Section */}
          <div className="flex items-center gap-3 pl-2">
            <Link to="/" className="group flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 dark:bg-navy-700 dark:text-primary-light">
                <img src="/favicon.svg" alt="Logo" className="h-6 w-6 dark:invert" />
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
                      to={item.href}
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
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-navy-700 dark:text-primary-light">
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
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
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
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-base font-bold text-primary dark:bg-navy-700 dark:text-primary-light">
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
