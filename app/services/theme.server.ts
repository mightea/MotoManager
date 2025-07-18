import { createCookie } from "react-router";

// Define the shape of the data stored in the cookie
type Theme = "light" | "dark";

// Create a cookie object that will be used to store the theme
// The 'theme-prefs' name is what will show up in the browser's storage.
const themeCookie = createCookie("theme-prefs", {
  maxAge: 60 * 60 * 24 * 365, // One year
  path: "/",
});

// Gets the theme from the request's cookie
export async function getTheme(request: Request): Promise<Theme> {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await themeCookie.parse(cookieHeader)) || {};
  // Default to 'light' if no theme is set in the cookie
  return cookie.theme === "dark" ? "dark" : "light";
}

// Sets the theme cookie in the response headers
export async function setTheme(theme: Theme) {
  // Serialize the cookie with the new theme value
  return themeCookie.serialize({ theme });
}
