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
  engineNumber: z.preprocess(emptyStringToUndefined, z.string().optional()),
  fabricationDate: z.preprocess(
    emptyStringToUndefined,
    z.string()
      .regex(/^(0[1-9]|1[0-2])\/\d{4}$|^\d{4}$/, "Ungültiges Format (z.B. 07/1997 oder 1997)")
      .optional()
  ),
  vehicleIdNr: z.preprocess(emptyStringToUndefined, z.string().optional()),
  numberPlate: z.preprocess(emptyStringToUndefined, z.string().optional()),
  firstRegistration: z.preprocess(emptyStringToUndefined, z.string().optional()),
  initialOdo: z.preprocess(preprocessInteger, z.number().min(0, "Anfangs-KM muss grösser oder gleich 0 sein.").optional()),
  purchaseDate: z.preprocess(emptyStringToUndefined, z.string().optional()),
  purchasePrice: z.preprocess(preprocessNumber, z.number().min(0, "Kaufpreis muss grösser oder gleich 0 sein.").optional()),
  currencyCode: z.preprocess(emptyStringToUndefined, z.string().optional()),
  isVeteran: z.preprocess(preprocessBoolean, z.boolean().default(false)),
  isArchived: z.preprocess(preprocessBoolean, z.boolean().default(false)),
  fuelTankSize: z.preprocess(preprocessNumber, z.number().min(0, "Tankgrösse muss grösser oder gleich 0 sein.").optional()),
});

export const previousOwnerSchema = z.object({
  name: z.string().min(1, "Vorname ist erforderlich."),
  surname: z.string().min(1, "Nachname ist erforderlich."),
  purchaseDate: z.string().min(1, "Kaufdatum ist erforderlich."),
  address: z.preprocess(emptyStringToUndefined, z.string().optional()),
  city: z.preprocess(emptyStringToUndefined, z.string().optional()),
  postcode: z.preprocess(emptyStringToUndefined, z.string().optional()),
  country: z.preprocess(emptyStringToUndefined, z.string().optional()),
  phoneNumber: z.preprocess(emptyStringToUndefined, z.string().optional()),
  email: z.preprocess(emptyStringToUndefined, z.string().email("Ungültige E-Mail-Adresse.").optional()),
  comments: z.preprocess(emptyStringToUndefined, z.string().optional()),
});

export type PreviousOwnerFormValues = z.infer<typeof previousOwnerSchema>;
export type MotorcycleFormValues = z.infer<typeof motorcycleSchema>;
