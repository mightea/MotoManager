import { useOutletContext } from "react-router";
import MaintenanceInsights from "~/components/maintenance-insights";
import type { Route } from "./+types/motorcycle.insights";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleInsightsRoute(
  _props: Route.ComponentProps,
) {
  const { maintenanceEntries, currentOdo } =
    useOutletContext<MotorcycleOutletContext>();

  return (
    <MaintenanceInsights
      maintenanceEntries={maintenanceEntries}
      currentOdo={currentOdo}
    />
  );
}
