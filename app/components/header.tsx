import { Bike, LogOut, Settings } from "lucide-react";
import { Link, NavLink, useSubmit } from "react-router";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useAuth } from "~/contexts/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useMemo } from "react";

const navLinks = [
  { href: "/", label: "Übersicht" },
  { href: "/documents", label: "Dokumente" },
  { href: "/settings", label: "Einstellungen" },
];

export function Header() {
  const submit = useSubmit();
  const { user } = useAuth();

  const initials = useMemo(() => {
    if (!user?.name) {
      return "MB";
    }

    const letters = user.name
      .split(" ")
      .map((part) => part.trim().charAt(0).toUpperCase())
      .filter(Boolean)
      .slice(0, 2);

    return letters.length > 0 ? letters.join("") : "MB";
  }, [user?.name]);

  const handleLogout = () => {
    submit(null, { method: "post", action: "/auth/logout" });
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div
        className="absolute inset-0 h-[140px] bg-gradient-to-b from-background/80 via-background/60 to-transparent blur-xl"
        aria-hidden="true"
      />
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
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs uppercase">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium md:inline">
                      {user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
