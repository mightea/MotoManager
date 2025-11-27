import type { LoaderFunctionArgs } from "react-router";
import type { Motorcycle } from "~/db/schema";
import type { NextInspectionInfo } from "~/utils/inspection";
import type { DocumentSummary } from "~/components/document-card";

export type DocumentWithAssignment = DocumentSummary & {
  assignedMotorcycleNames: string[];
};

export type DocumentAssignment = {
  documentId: number;
  motorcycleId: number;
};

export namespace Route {
  export type LoaderArgs = LoaderFunctionArgs;
  export type LoaderData = {
    motorcycle: Motorcycle;
    nextInspection: NextInspectionInfo | null;
    currentLocationName: string | null;
    assignedDocs: DocumentWithAssignment[];
    unassignedDocs: DocumentWithAssignment[];
    userId: number;
    allMotorcycles: (Motorcycle & { ownerName: string | null })[];
    docAssignments: DocumentAssignment[];
  };
  export type ComponentProps = { loaderData: LoaderData };
}
