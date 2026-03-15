const STORAGE_KEY = "moto_user_prefs";

export interface UserPrefs {
  sort?: string;
}

export function getUserPrefs(): UserPrefs {
  if (typeof window === "undefined") return {};
  try {
    const prefs = localStorage.getItem(STORAGE_KEY);
    return prefs ? JSON.parse(prefs) : {};
  } catch {
    return {};
  }
}

export function setUserPrefs(prefs: UserPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
