import type { TorqueSpecification } from "~/types/db";

export type TorqueImportCandidate = {
  id: number;
  make: string;
  model: string;
  fabricationDate: string | null;
  numberPlate: string | null;
  ownerUsername: string | null;
  torqueSpecifications: TorqueSpecification[];
};
