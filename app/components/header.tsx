import { Form, Link, useLocation } from "react-router";
import { Bike, LogOut, Menu, X, Settings, Shield, ChevronDown, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { type PublicUser } from "~/types/auth";
import clsx from "clsx";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";

import { syncStore } from "~/services/sync-store.client";
import { useIsOffline } from "~/utils/offline";

export function Header({ user }: { user: PublicUser | null }) {
  const location = useLocation();
  const isOffline = useIsOffline();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const { status: syncStatus, count: syncedCount } = useSyncExternalStore(
    syncStore.subscribe,
    syncStore.getSnapshot,
    () => ({ status: "idle" as const, count: 0 })
  );

  const userMenuRef = useRef<HTMLDivElement>(null);
  const isMotorcycleDetail = location.pathname.startsWith("/motorcycle/");

  // Close user menu if we go offline
  useEffect(() => {
    if (isOffline) {
      setIsUserMenuOpen(false);
    }
  }, [isOffline]);

  const navItems = [
    { label: "Übersicht", href: "/" },
    { label: "Dokumente", href: "/documents" },
    { label: "Ausgaben", href: "/fleet-expenses", disabled: isOffline },
    { label: "Statistiken", href: "/fleet-stats", disabled: isOffline },
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

  return (
    <div
      className={clsx(
        "z-40 w-full print:hidden transition-all duration-300",
        !isMotorcycleDetail ? "sticky top-0" : "relative",
        isOffline 
          ? "border-b border-orange-500 bg-orange-50/90 backdrop-blur-md dark:border-orange-500/50 dark:bg-orange-950/20" 
          : "border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/90"
      )}
    >
      <header className="mx-auto w-full max-w-7xl relative">
        {/* Motorsport Stripe Accent / Offline Status Stripe */}
        <div className={clsx(
          "absolute left-0 right-0 top-0 h-1.5 transition-all duration-500",
          isOffline
            ? "bg-orange-500"
            : "bg-gradient-to-r from-[#008AC9] via-[#2B115A] to-[#F11A22]"
        )} />

        <div className="flex items-center justify-between p-3 pt-4">
          {/* Logo Section */}
          <div className="flex items-center gap-3 pl-2">
            <Link to="/" className="group flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 dark:bg-navy-700 dark:text-primary-light">
                <Bike className="h-8 w-8" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 min-h-[1.25rem]">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary dark:text-navy-400">
                    MotoManager
                  </span>
                  <div className="w-12"> {/* Reserved space for offline badge */}
                    {isOffline && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-in fade-in zoom-in duration-300">
                        <WifiOff className="h-2 w-2" />
                        Offline
                      </span>
                    )}
                  </div>
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
                const isDisabled = (item as any).disabled;
                
                return (
                  <li key={item.label}>
                    <Link
                      to={isDisabled ? "#" : item.href}
                      onClick={(e) => isDisabled && e.preventDefault()}
                      className={clsx(
                        "block rounded-full px-5 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-white shadow-sm dark:bg-primary-light dark:text-navy-900"
                          : isDisabled
                            ? "text-secondary/30 cursor-not-allowed pointer-events-none"
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
            {/* Sync Indicator */}
            {syncStatus !== "idle" && (
              <div className={clsx(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all animate-in fade-in zoom-in duration-300",
                syncStatus === "syncing" && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                syncStatus === "success" && "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                syncStatus === "error" && "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {syncStatus === "syncing" && <RefreshCw className="h-3 w-3 animate-spin" />}
                {syncStatus === "success" && <CheckCircle2 className="h-3 w-3" />}
                <span className="hidden sm:inline">
                  {syncStatus === "syncing" ? "Synchronisiere..." : syncStatus === "success" ? `${syncedCount} Einträge synchronisiert` : "Sync Fehler"}
                </span>
              </div>
            )}

            <ThemeToggle />

            {user ? (
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  onClick={() => !isOffline && setIsUserMenuOpen(!isUserMenuOpen)}
                  disabled={isOffline}
                  className={clsx(
                    "flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 transition-all",
                    isOffline 
                      ? "bg-gray-100/50 cursor-not-allowed opacity-50 dark:bg-navy-900/20" 
                      : "bg-gray-50 hover:bg-gray-100 dark:bg-navy-900/50 dark:hover:bg-navy-900",
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
                className="hidden rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:block"
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
        <div
          className={clsx(
            "overflow-hidden rounded-b-2xl transition-all duration-300 ease-in-out md:hidden",
            isMobileMenuOpen
              ? "max-h-[600px] border-t border-gray-100 opacity-100 dark:border-navy-700"
              : "max-h-0 opacity-0"
          )}
        >
          <div className="p-4">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                const isDisabled = (item as any).disabled;

                return (
                  <Link
                    key={item.label}
                    to={isDisabled ? "#" : item.href}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        return;
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className={clsx(
                      "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                        : isDisabled
                          ? "text-secondary/30 cursor-not-allowed"
                          : "text-secondary hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {user && (
                <div className={clsx(
                  "mt-4 border-t border-gray-100 pt-4 dark:border-navy-700 transition-opacity",
                  isOffline && "opacity-50 pointer-events-none"
                )}>
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
                  className="mt-4 block w-full rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-[0.98]"
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>
    </div>
  );
}
