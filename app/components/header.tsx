import { Bike, Settings } from "lucide-react";
import { Link, NavLink } from "react-router";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

const navLinks = [
  { href: "/", label: "Übersicht" },
  { href: "/documents", label: "Dokumente" },
  { href: "/settings", label: "Einstellungen" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 h-[140px] bg-gradient-to-b from-background/80 via-background/60 to-transparent blur-xl" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-white/80 px-5 py-4 shadow-lg backdrop-blur-xl dark:border-border/30 dark:bg-slate-900/80">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bike className="h-5 w-5" />
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Motobase
              </p>
              <h1 className="text-xl font-semibold font-headline text-foreground">
                Garage Cockpit
              </h1>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2 py-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="md:hidden">
              <Link to="/settings" aria-label="Einstellungen">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
