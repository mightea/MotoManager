import { Form, Link } from "react-router";
import type { Route } from "./+types/motorcycle";
import db from "~/db";
import { motorcycles, type Motorcycle } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ params }: Route.LoaderArgs) {
  const motorcycleId = Number.parseInt(params.motorcycleId);

  if (isNaN(motorcycleId)) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  const result = await db.query.motorcycles.findFirst({
    where: eq(motorcycles.id, motorcycleId),
  });

  if (result === undefined) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  return { motorcycle: result };
}

export default function Motorcycle({ loaderData }: Route.ComponentProps) {
  const { motorcycle } = loaderData;
  const { id, make, model, vin } = motorcycle;

  const entries: [string, string][] = [
    ["Fahrgestellnummer", vin],
    ["Stammnummer", motorcycle.vehicleIdNr],
    ["Erstzulassung", motorcycle.firstRegistration],
    ["Letzte Inspektion", String(motorcycle.lastInspection)],
    ["Kilometerstand", motorcycle.initialOdo.toString()],
  ];

  return (
    <div className="flex flex-col pt-2 px-4">
      <div className="flex flex-col p-2 px-2 gap-2 rounded-lg bg-white dark:bg-gray-800">
        <h1 className="text-2xl">
          {make} {model}
        </h1>
        {entries.map((entry, index) => (
          <div
            key={`general-${index}`}
            className="flex flex-row gap-2 items-stretch "
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm grow">
              {entry[0]}:
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm align-right">
              {entry[1]}
            </p>
          </div>
        ))}

        <Link to={`/motorcycle/${id}/edit`}>Edit</Link>
      </div>
    </div>
  );
}
