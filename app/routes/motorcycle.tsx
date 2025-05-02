import { Form } from "react-router";
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

  return (
    <div>
      <p className="text-6xl">
        {motorcycle.make} {motorcycle.model}
      </p>
      <p>{motorcycle.vin}</p>
    </div>
  );
}
