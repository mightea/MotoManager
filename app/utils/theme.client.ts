import { Theme, isTheme } from "./theme";

const STORAGE_KEY = "moto_theme";

export function getTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const theme = localStorage.getItem(STORAGE_KEY);
  if (isTheme(theme)) {
    return theme;
  }
  return null;
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
}
