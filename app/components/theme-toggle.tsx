import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Theme } from "~/utils/theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const nextTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="grid h-10 w-10 place-items-center rounded-sm border border-base-content/15 bg-base-100 text-base-content/65 transition-colors hover:border-base-content/35 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
      aria-label={theme === Theme.LIGHT ? "Dunkelmodus aktivieren" : "Hellmodus aktivieren"}
    >
      {theme === Theme.LIGHT ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
