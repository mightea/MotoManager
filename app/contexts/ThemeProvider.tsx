import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useContext,
} from "react";

const ThemeContext = createContext({
  theme: "system", // default theme
  setTheme: (theme: string) => {}, // function to set theme
});

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("system"); // 'light', 'dark', or 'system'

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    root.classList.remove(isDark ? "light" : "dark");
    root.classList.add(isDark ? "dark" : "light");

    localStorage.setItem("theme", theme);
  }, [theme]);

  const contextValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export { ThemeContext, ThemeProvider };
