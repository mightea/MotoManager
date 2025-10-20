import type { TorqueSpecification } from "~/db/schema";

export type TorqueImportCandidate = {
  id: number;
  make: string;
  model: string;
  modelYear: number | null;
  numberPlate: string | null;
  ownerUsername: string | null;
  torqueSpecifications: TorqueSpecification[];
};
