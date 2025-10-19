import { useOutletContext } from "react-router";
import MotorcycleInfo from "~/components/motorcycle-info";
import { OpenIssuesCard } from "~/components/open-issues-card";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleInfoRoute() {
  const { motorcycle, issues, currentOdo } =
    useOutletContext<MotorcycleOutletContext>();

  return (
    <div className="space-y-8 lg:hidden">
      <MotorcycleInfo />
      <OpenIssuesCard
        motorcycle={motorcycle}
        issues={issues}
        currentOdometer={currentOdo}
      />
    </div>
  );
}
