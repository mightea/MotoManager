import { Form, Link } from "react-router";
import { Bike, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import type { User } from "~/db/schema";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-background/80 backdrop-blur-md dark:border-darkblue-700 dark:bg-darkblue-900/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary dark:bg-darkblue-700 dark:text-darkblue-200">
              <Bike className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground dark:text-gray-50 hidden sm:block">
              MotoManager
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground dark:text-gray-200 hidden md:block">
                {user.username}
              </span>
              <Form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md p-2 text-secondary hover:bg-gray-100 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-darkblue-800 dark:hover:text-gray-50"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </Form>
            </div>
          ) : (
            <Link
              to="/auth/login"
              className="text-sm font-medium text-primary hover:underline dark:text-darkblue-400"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}