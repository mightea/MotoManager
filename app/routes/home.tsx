import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/home";
import db from "~/db";
import { motorcycles } from "~/db/schema";
import { MotorcycleSummaryCard } from "~/components/motorcycle-summary-card";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Bike, List, PlusCircle } from "lucide-react";
import { AddMotorcycleDialog } from "~/components/add-motorcycle-dialog";

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
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-bold font-headline text-primary">
          Alle Motorräder
        </h1>
        <p className="text-muted-foreground mt-1">
          Eine Übersicht deiner gesamten Sammlung.
        </p>
      </header>
      {motorcycles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {motorcycles.map((moto) => (
            <MotorcycleSummaryCard key={moto.id} {...moto} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Bike className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-semibold">Noch keine Motorräder</h2>
          <p className="mt-2 text-muted-foreground">
            Füge dein erstes Motorrad hinzu, um loszulegen.
          </p>
          <div className="mt-6">
            <AddMotorcycleDialog onMotorcycleAdded={handleMotorcycleAdded}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Dein erstes Motorrad
                hinzufügen
              </Button>
            </AddMotorcycleDialog>
          </div>
        </div>
      )}{" "}
    </div>
  );
}
