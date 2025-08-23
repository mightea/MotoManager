import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/settings";
import { useLoaderData } from "react-router";
import { Separator } from "~/components/ui/separator";
import db from "~/db";
import { StorageLocationsForm } from "~/components/storage-locations-form";
import { locations, type NewLocation } from "~/db/schema";
import { data } from "react-router";
import { eq } from "drizzle-orm";
import { useSettings } from "~/contexts/SettingsProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Settings" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const result = await db.query.locations.findMany();
  return result;
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const fields = Object.fromEntries(formData);

  const { intent } = fields;
  console.log("Action called with intent:", intent);
  console.log("Fields:", fields);

  if (intent === "location-add") {
    const item = await db
      .insert(locations)
      .values({
        name: fields.name as string,
      })
      .returning();

    return data({
      success: true,
      name: item[0].name,
      intent: "location-add",
    });
  }

  if (intent === "location-edit") {
    const item = await db
      .update(locations)
      .set({
        name: fields.name as string,
      })
      .where(eq(locations.id, Number.parseInt(fields.id as string)))
      .returning();

    return data({
      success: true,
      name: item[0].name,
      intent: "location-edit",
    });
  }

  if (intent === "location-delete") {
    console.log("Deleting location with ID:", fields.id);
    await db
      .delete(locations)
      .where(eq(locations.id, Number.parseInt(fields.id as string)));

    return data({
      success: true,
      intent: "location-delete",
      name: fields.name,
    });
  }
}

export default function Settings() {
  const locations = useLoaderData<typeof loader>();
  const { setLocations } = useSettings();
  setLocations(locations);

  return (
    <main className="flex flex-col pt-10 px-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalte deine Kontoeinstellungen und Präferenzen.
        </p>
      </header>
      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Garagen / Standorte</CardTitle>
            <CardDescription>
              Verwalte die Orte, an denen du deine Motorräder abstellst oder
              wartest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StorageLocationsForm />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Währungen</CardTitle>
            <CardDescription>
              Verwalte die Währungseinstellungen für die App.
            </CardDescription>
          </CardHeader>
          <CardContent></CardContent>
        </Card>
      </div>
    </main>
  );
}
