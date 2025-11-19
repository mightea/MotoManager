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
      className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-secondary hover:bg-gray-50 hover:text-foreground dark:border-navy-700 dark:bg-navy-800 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-white"
      aria-label={theme === Theme.LIGHT ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === Theme.LIGHT ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
