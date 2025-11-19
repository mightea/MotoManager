import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/home";
import { getDb } from "~/db";
import { motorcycles, type NewMotorcycle } from "~/db/schema";
import { createMotorcycle } from "~/db/providers/motorcycles.server";
import { eq } from "drizzle-orm";
import { mergeHeaders, requireUser } from "~/services/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireUser(request);
  const db = await getDb();

  const motorcyclesList = await db.query.motorcycles.findMany({
    where: eq(motorcycles.userId, user.id),
  });

  return data(
    { motorcycles: motorcyclesList, user },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();

  const parseString = (value: FormDataEntryValue | null | undefined) =>
    typeof value === "string" ? value : "";

  const parseNumber = (
    value: FormDataEntryValue | null | undefined,
    fallback?: number,
  ) => {
    const parsed = Number.parseFloat(parseString(value));
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseInteger = (
    value: FormDataEntryValue | null | undefined,
    fallback?: number,
  ) => {
    const parsed = Number.parseInt(parseString(value), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseBoolean = (value: FormDataEntryValue | null | undefined) =>
    parseString(value) === "true";

  const modelYear = parseInteger(formData.get("modelYear"));

  const newMotorcycle: NewMotorcycle = {
    make: parseString(formData.get("make")),
    model: parseString(formData.get("model")),
    ...(modelYear !== undefined ? { modelYear } : {}),
    userId: user.id,
    vin: parseString(formData.get("vin")),
    vehicleIdNr: parseString(formData.get("vehicleIdNr")) || undefined,
    numberPlate: parseString(formData.get("numberPlate")) || undefined,
    isVeteran: parseBoolean(formData.get("isVeteran")),
    isArchived: parseBoolean(formData.get("isArchived")),
    firstRegistration: parseString(formData.get("firstRegistration")),
    initialOdo: parseInteger(formData.get("initialOdo")) ?? 0,
    purchaseDate: parseString(formData.get("purchaseDate")),
    purchasePrice: parseNumber(formData.get("purchasePrice")) ?? 0,
  };

  const dbClient = await getDb();
  await createMotorcycle(dbClient, newMotorcycle);

  return data({ success: true }, { headers: mergeHeaders(headers ?? {}) });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { motorcycles, user } = loaderData;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>MotoManager</h1>
      <p>Welcome, {user.username || user.email}</p>
      
      <Form action="/auth/logout" method="post">
        <button type="submit">Logout</button>
      </Form>

      <hr />

      <h2>Your Motorcycles</h2>
      {motorcycles.length === 0 ? (
        <p>No motorcycles found.</p>
      ) : (
        <ul>
          {motorcycles.map((moto) => (
            <li key={moto.id}>
              <strong>{moto.make} {moto.model}</strong> ({moto.modelYear || "N/A"})
              <br />
              VIN: {moto.vin}
            </li>
          ))}
        </ul>
      )}

      <hr />

      <h2>Add Motorcycle</h2>
      <Form method="post" style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
        <div>
          <label htmlFor="make">Make:</label>
          <br />
          <input type="text" name="make" id="make" required />
        </div>
        <div>
          <label htmlFor="model">Model:</label>
          <br />
          <input type="text" name="model" id="model" required />
        </div>
        <div>
          <label htmlFor="modelYear">Year:</label>
          <br />
          <input type="number" name="modelYear" id="modelYear" />
        </div>
        <div>
          <label htmlFor="vin">VIN:</label>
          <br />
          <input type="text" name="vin" id="vin" required />
        </div>
        <div>
          <label htmlFor="initialOdo">Initial Odometer:</label>
          <br />
          <input type="number" name="initialOdo" id="initialOdo" defaultValue={0} />
        </div>
        <button type="submit">Add Motorcycle</button>
      </Form>
    </div>
  );
}

