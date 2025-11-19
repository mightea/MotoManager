import { Form, data, redirect } from "react-router";
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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">MotoManager</h1>
      <p className="text-lg mb-6">Welcome, {user.username || user.email}</p>
      
      <Form action="/auth/logout" method="post" className="mb-8">
        <button type="submit" className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          Logout
        </button>
      </Form>

      <h2 className="text-2xl font-semibold mb-4">Your Motorcycles</h2>
      {motorcycles.length === 0 ? (
        <p className="text-gray-600">No motorcycles found.</p>
      ) : (
        <ul className="space-y-4">
          {motorcycles.map((moto) => (
            <li key={moto.id} className="border p-4 rounded-md shadow-sm">
              <strong className="text-xl">{moto.make} {moto.model}</strong> (<span className="text-gray-600">{moto.modelYear || "N/A"}</span>)
              <br />
              <span className="text-gray-500">VIN: {moto.vin}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-2xl font-semibold mt-8 mb-4">Add Motorcycle</h2>
      <Form method="post" className="space-y-4 p-6 border rounded-lg shadow-md max-w-lg bg-gray-50">
        <div>
          <label htmlFor="make" className="block text-sm font-medium text-gray-700">Make:</label>
          <input type="text" name="make" id="make" required 
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">Model:</label>
          <input type="text" name="model" id="model" required 
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
        </div>
        <div>
          <label htmlFor="modelYear" className="block text-sm font-medium text-gray-700">Year:</label>
          <input type="number" name="modelYear" id="modelYear" 
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
        </div>
        <div>
          <label htmlFor="vin" className="block text-sm font-medium text-gray-700">VIN:</label>
          <input type="text" name="vin" id="vin" required 
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
        </div>
        <div>
          <label htmlFor="initialOdo" className="block text-sm font-medium text-gray-700">Initial Odometer:</label>
          <input type="number" name="initialOdo" id="initialOdo" defaultValue={0} 
                 className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"/>
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add Motorcycle
        </button>
      </Form>
    </div>
  );
}
