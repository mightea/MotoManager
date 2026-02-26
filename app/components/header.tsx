import { Form, Link, useLocation } from "react-router";
import { Bike, LogOut, Menu, X, Settings, Shield, ChevronDown } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "~/db/schema";
import clsx from "clsx";
import { useEffect, useState, useRef } from "react";
import { useIsOffline } from "~/utils/offline-status";

export function Header({ user }: { user: User | null }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isMotorcycleDetail = location.pathname.startsWith("/motorcycle/");
  const isOffline = useIsOffline();

  const navItems = [
    { label: "Übersicht", href: "/" },
    { label: "Dokumente", href: "/documents" },
    { label: "Statistiken", href: "/fleet-stats" },
  ];

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        "z-40 flex justify-center pointer-events-none print:hidden",
        // On mobile motorcycle detail: non-fixed, scrolls with page naturally
        isMotorcycleDetail
          ? "relative md:fixed md:top-4 md:px-4 md:left-0 md:right-0 transition-transform duration-300 ease-out"
          : "fixed top-0 md:top-4 left-0 right-0 md:px-4 transition-transform duration-300 ease-out",
        // Hide transform only on desktop motorcycle detail
        isMotorcycleDetail && isHidden && "md:-translate-y-full"
      )}
    >
      <header className="relative w-full max-w-7xl rounded-b-2xl border border-gray-200 bg-white/90 shadow-xl backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/90 pointer-events-auto">
        {/* Motorsport Stripe Accent */}
        <div className="absolute left-0 right-0 top-0 h-2.5 bg-gradient-to-r from-[#008AC9] via-[#2B115A] to-[#F11A22]" />

        <div className="flex items-center justify-between p-3 pt-5">
          {/* Logo Section */}
          <div className="flex items-center gap-3 pl-2">
            <Link to="/" className="group flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 dark:bg-navy-700 dark:text-primary-light">
                <Bike className="h-8 w-8" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary dark:text-navy-400">
                    MotoManager
                  </span>
                  {isOffline && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.5rem] font-extrabold uppercase tracking-tight text-white animate-pulse">
                      Offline
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold leading-none tracking-tight text-foreground dark:text-white">
                  Garagenverwaltung
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
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={clsx(
                    "flex items-center gap-3 rounded-full bg-gray-50 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-gray-100 dark:bg-navy-900/50 dark:hover:bg-navy-900",
                    isUserMenuOpen && "bg-gray-100 dark:bg-navy-900"
                  )}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-navy-700 dark:text-primary-light">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground dark:text-gray-200">
                    {user.username}
                  </span>
                  <ChevronDown className={clsx("h-4 w-4 text-secondary transition-transform", isUserMenuOpen && "rotate-180")} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-navy-700 dark:bg-navy-800">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-400">Konto</p>
                    </div>
                    
                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                    >
                      <Settings className="h-4 w-4" />
                      Einstellungen
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        to="/settings/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                      >
                        <Shield className="h-4 w-4" />
                        Admin-Bereich
                      </Link>
                    )}

                    <div className="my-1 h-px bg-gray-100 dark:bg-navy-700" />

                    <Form action="/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4" />
                        Abmelden
                      </button>
                    </Form>
                  </div>
                )}
              </div>
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
          <div className="border-t border-gray-100 p-4 rounded-b-2xl md:hidden dark:border-navy-700">
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
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground dark:text-gray-200">
                        {user.username}
                      </span>
                      <span className="text-xs text-secondary dark:text-navy-400 capitalize">{user.role}</span>
                    </div>
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-secondary transition-colors hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                  >
                    <Settings className="h-5 w-5" />
                    Einstellungen
                  </Link>

                  {user.role === "admin" && (
                    <Link
                      to="/settings/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-secondary transition-colors hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                    >
                      <Shield className="h-5 w-5" />
                      Admin-Bereich
                    </Link>
                  )}

                  <Form action="/auth/logout" method="post" className="mt-2">
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
