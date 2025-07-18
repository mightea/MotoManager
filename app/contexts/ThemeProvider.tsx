import React, { useContext } from "react";
import { useFetcher } from "react-router";

// Define the shape of the data stored in the cookie
type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);
  const fetcher = useFetcher();

  // Function to optimistically update the theme on the client
  // and submit the change to the server action to update the cookie.
  const handleThemeChange = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Use the fetcher to submit the new theme to the action
    // This happens in the background without a page reload.
    fetcher.submit(
      { theme: newTheme },
      { method: "post", action: "/api/set-theme" }
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
