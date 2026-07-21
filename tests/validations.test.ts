import { describe, it, expect } from "vitest";
import { motorcycleSchema, previousOwnerSchema } from "~/validations";

describe("motorcycleSchema", () => {
  const validBase = {
    make: "Yamaha",
    model: "MT-07",
  };

  it("should validate a correct MM/YYYY fabricationDate", () => {
    const data = motorcycleSchema.parse({
      ...validBase,
      fabricationDate: "07/1997",
    });
    expect(data.fabricationDate).toBe("07/1997");
  });

  it("should validate a correct YYYY fabricationDate without transforming it", () => {
    const data = motorcycleSchema.parse({
      ...validBase,
      fabricationDate: "1993",
    });
    expect(data.fabricationDate).toBe("1993");
  });

  it("should fail for invalid fabricationDate format", () => {
    const result = motorcycleSchema.safeParse({
      ...validBase,
      fabricationDate: "13/1997",
    });
    expect(result.success).toBe(false);
  });

  it("should fail for invalid year format", () => {
    const result = motorcycleSchema.safeParse({
      ...validBase,
      fabricationDate: "93",
    });
    expect(result.success).toBe(false);
  });

  it("should allow empty fabricationDate", () => {
    const data = motorcycleSchema.parse({
      ...validBase,
      fabricationDate: "",
    });
    expect(data.fabricationDate).toBeUndefined();
  });
});

describe("previousOwnerSchema", () => {
  it("allows an unknown purchase date", () => {
    const data = previousOwnerSchema.parse({
      name: "Anna",
      surname: "Muster",
      purchaseDate: "",
    });

    expect(data.purchaseDate).toBeUndefined();
  });

  it("still requires the owner's name", () => {
    const result = previousOwnerSchema.safeParse({
      name: "",
      surname: "Muster",
      purchaseDate: "",
    });

    expect(result.success).toBe(false);
  });
});
