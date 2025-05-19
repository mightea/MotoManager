import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import db from "~/db";
import { motorcycles } from "~/db/schema";
import { MotorcycleCard } from "~/components/MotorcycleCard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}
export async function loader({}: Route.LoaderArgs) {
  const motorcycles = await db.query.motorcycles.findMany();
  return { motorcycles };
}

export async function action() {
  const motorcycle = await db
    .insert(motorcycles)
    .values({
      model: "",
      make: "",
      vin: "",
      vehicleIdNr: "",
      licenseType: "regular",
      firstRegistration: "",
      lastInspection: "",
      isVeteran: false,
      initialOdo: 0,
    })
    .returning();

  return redirect(`/motorcycle/${motorcycle[0].id}/edit`);
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { motorcycles } = loaderData;

  const getMotorcycleAge = (dateString: string): string | null => {
    const date = new Date(dateString);
    return new Date().getFullYear() - date.getFullYear();
  };

  return (
    <main className="flex flex-col pt-4 px-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {motorcycles.map((motorcycle, index) => (
          <MotorcycleCard {...motorcycle} key={`mc-${index}`} />
        ))}
      </div>
      <ul role="list" className=""></ul>

      <Form method="post">
        <button type="submit">Neu</button>
      </Form>
    </main>
  );
}
