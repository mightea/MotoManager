import { createCookie } from "react-router";
import { Theme, isTheme } from "./theme";

const COOKIE_NAME = "moto_theme";
const THEME_COOKIE_DURATION = 31536000; // One year

export const themeCookie = createCookie(COOKIE_NAME, {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: THEME_COOKIE_DURATION,
});

export async function getTheme(request: Request): Promise<Theme | null> {
  const cookieHeader = request.headers.get("Cookie");
  const theme = await themeCookie.parse(cookieHeader);
  if (isTheme(theme)) {
    return theme;
  }
  return null;
}

export async function setTheme(theme: Theme) {
  return await themeCookie.serialize(theme);
}

export { Theme, isTheme };
