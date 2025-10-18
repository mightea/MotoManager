import { redirect } from "react-router";
import type { Route } from "./+types/motorcycle.index";

export function loader(_: Route.LoaderArgs) {
  return redirect("maintenance");
}

export default function MotorcycleIndex(_props: Route.ComponentProps) {
  return null;
}
