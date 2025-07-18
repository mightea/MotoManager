import { data, type ActionFunctionArgs } from "react-router";
import { setTheme } from "~/services/theme.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get("theme");

  if (theme === "light" || theme === "dark") {
    return data(
      { success: true },
      {
        headers: {
          "Set-Cookie": await setTheme(theme),
        },
      }
    );
  }

  return data({ success: false }, { status: 400 });
}
