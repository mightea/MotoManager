import type { LoaderFunctionArgs } from "react-router";
import type { User, Motorcycle, Issue, MaintenanceRecord } from "~/db/schema";
import type { NextInspectionInfo } from "~/utils/inspection";

export namespace Route {
  export type LoaderArgs = LoaderFunctionArgs;
  export type LoaderData = {
    motorcycle: Motorcycle;
    user: User;
    openIssues: Issue[];
    maintenanceHistory: MaintenanceRecord[];
    nextInspection: NextInspectionInfo | null;
  };
  export type ComponentProps = { loaderData: LoaderData };
}
