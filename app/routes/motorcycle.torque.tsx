import { useOutletContext } from "react-router";
import TorqueSpecificationsPanel from "~/components/torque-specifications-panel";
import type { Route } from "./+types/motorcycle.torque";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleTorqueRoute(
  _props: Route.ComponentProps,
) {
  const { motorcycle, torqueSpecifications } =
    useOutletContext<MotorcycleOutletContext>();

  return (
    <TorqueSpecificationsPanel
      motorcycleId={motorcycle.id}
      specs={torqueSpecifications}
    />
  );
}
