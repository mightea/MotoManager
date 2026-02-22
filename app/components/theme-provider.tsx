import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Theme } from "~/utils/theme";
import { useFetcher } from "react-router";

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

  const fetcher = useFetcher();
  const persistThemeRef = useRef(fetcher);

  // Persist theme to server when it changes (but not on initial mount if it matches)
  useEffect(() => {
    const persistTheme = persistThemeRef.current;
    if (theme) {
      persistTheme.submit(
        { theme },
        { action: "/api/set-theme", method: "post" }
      );
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

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
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
