import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import db from "~/db";
import { motorcycles } from "~/db/schema";

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
    })
    .returning();

  return redirect(`/motorcycle/${motorcycle[0].id}/edit`);
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { motorcycles } = loaderData;

  return (
    <main className="flex flex-col pt-10 px-4">
      <h1 className="text-6xl">Home</h1>
      <Link to="/settings" className="text-blue-500">
        Settings
      </Link>

      <h2>Motorcycles</h2>
      <ul role="list" className="divide-y divide-gray-100">
        {motorcycles.map((motorcycle) => (
          <li key={motorcycle.id} className="flex justify-between gap-x-6 py-5">
            <div className="flex min-w-0 gap-x-4">
              <div className="min-w-0 flex-auto">
                <Link
                  to={`/motorcycle/${motorcycle.id}/edit`}
                  className="text-sm/6 font-semibold leading-6"
                >
                  {motorcycle.make === "" ? "Unknown" : motorcycle.make}{" "}
                  {motorcycle.model}
                </Link>
                <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                  {motorcycle.vin}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Form method="post">
        <button type="submit">New</button>
      </Form>
    </main>
  );
}
