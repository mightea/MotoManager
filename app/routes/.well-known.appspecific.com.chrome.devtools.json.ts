import { type LoaderFunctionArgs, data } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return data({
    "web_application_id": "motomanager",
    "url": "http://localhost:3000/",
    "last_used": new Date().toISOString()
  });
}
