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
      className="rounded-full p-2 text-secondary hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-gray-400 dark:hover:bg-darkblue-800"
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
