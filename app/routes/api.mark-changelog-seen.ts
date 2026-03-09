import { type ActionFunctionArgs, data } from "react-router";
import { markChangelogSeen } from "~/services/changelog.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const version = formData.get("version");
  
  if (typeof version !== "string") {
    return data({ error: "Version is required" }, { status: 400 });
  }
  
  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await markChangelogSeen(version),
      },
    }
  );
}
