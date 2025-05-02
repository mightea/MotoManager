import type { Route } from "./+types/settings";
import { Link, useLoaderData } from "react-router";
import db from "~/db";
import { type Location } from "~/db/schema";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings" }];
}

export const loader = async ({ request }): Promise<Location[]> => {
  const result = await db.query.locations.findMany();
  return result;
};

export default function Settings() {
  const locations = useLoaderData<typeof loader>();

  return (
    <main className="flex flex-col pt-10 px-4">
      <Link to="/">← Back to home</Link>
      <h1 className="text-6xl">Settings</h1>

      <section className="py-4">
        <h2 className="text-4xl">Locations</h2>

        <ul role="list" className="divide-y divide-gray-100">
          {locations.map((location) => (
            <li key={location.id} className="flex justify-between gap-x-6 py-5">
              <div className="flex min-w-0 gap-x-4">
                <div className="min-w-0 flex-auto">
                  <p className="text-sm/6 font-semibold">{location.name}</p>
                </div>
              </div>
              <div className="sm:flex sm:flex-col sm:items-end">
                <button>Edit</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
