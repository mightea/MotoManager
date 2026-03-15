import { createContext, useContext, useEffect, useState } from "react";
import type { Theme } from "~/utils/theme";
import { setTheme as persistTheme } from "~/utils/theme.client";

type ThemeContextType = {
  theme: Theme | null;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  specifiedTheme,
}: {
  children: React.ReactNode;
  specifiedTheme: Theme | null;
}) {
  const [theme, setThemeState] = useState<Theme | null>(() => {
    if (specifiedTheme) {
      return specifiedTheme;
    }
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      return mediaQuery.matches ? "dark" as Theme : "light" as Theme;
    }
    return null;
  });

  // Persist theme to localStorage when it changes
  useEffect(() => {
    if (theme) {
      persistTheme(theme);
    }
  }, [theme]);
  
  // Sync with system preference if no theme is set
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
        if (!specifiedTheme) {
            setThemeState(mediaQuery.matches ? "dark" as Theme : "light" as Theme);
        }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [specifiedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
