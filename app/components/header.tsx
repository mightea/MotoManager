import { Bike, Settings } from "lucide-react";
import { Link } from "react-router";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
      <div className="container mx-auto flex items-center p-4 h-20 gap-4">
        <Link to="/" className="flex items-center gap-3 mr-6">
          <Bike className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold font-headline hidden sm:inline-block">
            MotoManager
          </span>
        </Link>

        <div className="flex w-full items-center gap-2">
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="icon"
          aria-label="Einstellungen"
        >
          <Link to="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
