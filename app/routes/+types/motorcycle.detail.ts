import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { User, Motorcycle, Issue, MaintenanceRecord } from "~/db/schema";
import type { NextInspectionInfo } from "~/utils/inspection";
import type { MaintenanceInsight } from "~/utils/maintenance-intervals";

export namespace Route {
  export type LoaderArgs = LoaderFunctionArgs;
  export type ActionArgs = ActionFunctionArgs;
  export type LoaderData = {
    motorcycle: Motorcycle;
    user: User;
    openIssues: Issue[];
    maintenanceHistory: MaintenanceRecord[];
    nextInspection: NextInspectionInfo | null;
    lastKnownOdo: number | null;
    insights: MaintenanceInsight[];
  };
  export type ComponentProps = { loaderData: LoaderData };
}