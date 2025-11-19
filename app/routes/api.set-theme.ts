import { data, redirect } from "react-router";
import type { Route } from "./+types/api.set-theme";
import { getTheme, setTheme } from "~/utils/theme.server";
import { Theme, isTheme } from "~/utils/theme";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const theme = formData.get("theme");

  if (!isTheme(theme)) {
    return data({ success: false, message: "Invalid theme" }, { status: 400 });
  }

  return data(
    { success: true },
    { headers: { "Set-Cookie": await setTheme(theme) } }
  );
}
