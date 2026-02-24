import type { TorqueSpecification } from "~/db/schema";

export type TorqueImportCandidate = {
  id: number;
  make: string;
  model: string;
  fabricationDate: string | null;
  numberPlate: string | null;
  ownerUsername: string | null;
  torqueSpecifications: TorqueSpecification[];
};
