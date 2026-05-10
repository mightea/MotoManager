import { useLocation } from "react-router";
import { Menu as MenuIcon, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { type PublicUser } from "~/types/auth";
import { useEffect, useId, useRef, useState } from "react";
import { HeaderBrand } from "./header-brand";
import { HeaderDesktopNav } from "./header-desktop-nav";
import { HeaderMobilePanel } from "./header-mobile-panel";
import { HeaderUserMenu } from "./header-user-menu";
import { LoadingIndicator } from "./loading-indicator";
import { NAV_ITEMS } from "./header-nav-config";

export function Header({ user }: { user: PublicUser | null }) {
  const location = useLocation();
  const isMotorcycleDetail = location.pathname.startsWith("/motorcycle/");

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const mobilePanelId = useId();
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on ESC
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div
      className={
        "z-40 w-full print:hidden transition-all duration-300 border-b border-base-300 bg-base-100/90 backdrop-blur-md " +
        (!isMotorcycleDetail ? "sticky top-0" : "relative")
      }
    >
      <header className="mx-auto w-full max-w-7xl relative">
        <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />

        <div className="flex items-center justify-between p-3 pt-4">
          <HeaderBrand onNavigate={closeMobileMenu} />
          <HeaderDesktopNav items={NAV_ITEMS} />

          <div className="flex items-center gap-3 pr-2">
            <ThemeToggle />
            <HeaderUserMenu user={user} />

            {/* Mobile Menu Toggle */}
            <button
              ref={mobileToggleRef}
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={isMobileMenuOpen}
              aria-controls={mobilePanelId}
              aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
              className="grid h-10 w-10 place-items-center rounded-xl text-base-content/60 transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <HeaderMobilePanel
          id={mobilePanelId}
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          items={NAV_ITEMS}
          user={user}
        />
      </header>
      <LoadingIndicator />
    </div>
  );
}
