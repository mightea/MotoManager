import { redirect } from "react-router";

export function loader() {
  return redirect("maintenance");
}

export default function MotorcycleIndex() {
  return null;
}
