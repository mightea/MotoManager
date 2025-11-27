import { z } from "zod";

const emptyStringToUndefined = (val: unknown) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
};

const preprocessNumber = (val: unknown) => {
  if (typeof val === "string") {
    if (val.trim() === "") return undefined;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  return val;
};

const preprocessInteger = (val: unknown) => {
  if (typeof val === "string") {
    if (val.trim() === "") return undefined;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return val;
};

const preprocessBoolean = (val: unknown) => {
  return val === "true" || val === "on" || val === "1";
};

export const motorcycleSchema = z.object({
  make: z.string().min(1, "Marke ist erforderlich."),
  model: z.string().min(1, "Modell ist erforderlich."),
  vin: z.preprocess(emptyStringToUndefined, z.string().optional()),
  modelYear: z.preprocess(preprocessInteger, z.number().min(1900, "Jahrgang muss grösser als 1900 sein.").optional()),
  vehicleIdNr: z.preprocess(emptyStringToUndefined, z.string().optional()),
  numberPlate: z.preprocess(emptyStringToUndefined, z.string().optional()),
  firstRegistration: z.preprocess(emptyStringToUndefined, z.string().optional()),
  initialOdo: z.preprocess(preprocessInteger, z.number().min(0, "Anfangs-KM muss grösser oder gleich 0 sein.").optional()),
  purchaseDate: z.preprocess(emptyStringToUndefined, z.string().optional()),
  purchasePrice: z.preprocess(preprocessNumber, z.number().min(0, "Kaufpreis muss grösser oder gleich 0 sein.").optional()),
  currencyCode: z.preprocess(emptyStringToUndefined, z.string().optional()),
  isVeteran: z.preprocess(preprocessBoolean, z.boolean().default(false)),
  isArchived: z.preprocess(preprocessBoolean, z.boolean().default(false)),
});

export type MotorcycleFormValues = z.infer<typeof motorcycleSchema>;
