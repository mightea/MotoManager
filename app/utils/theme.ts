export enum Theme {
  DARK = "dark",
  LIGHT = "light",
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && Object.values(Theme).includes(value as Theme);
}
