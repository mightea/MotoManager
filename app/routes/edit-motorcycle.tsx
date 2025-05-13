import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/edit-motorcycle";
import db from "~/db";
import { motorcycles, type EditorMotorcycle } from "~/db/schema";
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

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // if the intent is delete, delete the contact
  if (intent === "delete") {
    try {
      await db
        .delete(motorcycles)
        .where(eq(motorcycles.id, parseInt(params.motorcycleId!)));
      return redirect("/");
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // if the intent is not delete, update the contact
  const updates: EditorMotorcycle = {
    make: formData.get("make") as string,
    model: formData.get("model") as string,
    vin: formData.get("vin") as string,
    vehicleIdNr: formData.get("motorcycleId") as string,
    licenseType: formData.get("licenseType") as "regular" | "veteran",
    firstRegistration: formData.get("firstRegistration") as string,
  };

  console.log("updates", updates, formData.get("make"));

  try {
    await db
      .update(motorcycles)
      .set(updates)
      .where(eq(motorcycles.id, parseInt(params.motorcycleId!)));

    // Redirect to the home page after successful update
    return redirect("/");
  } catch (error) {
    console.error("Error updating motorcycle:", error);
    return { success: false, error: (error as Error).message };
  }
}

export default function EditMotorcycle({ loaderData }: Route.ComponentProps) {
  const { motorcycle } = loaderData;

  const navigation = useNavigation();

  console.log("motorcycle", motorcycle);

  return (
    <Form
      className="max-w-sm mx-auto"
      method="post"
      id={motorcycle.id.toString()}
    >
      <div className="mb-5">
        <label
          htmlFor="make"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          Marke
        </label>
        <input
          type="text"
          name="make"
          className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
          placeholder="BMW"
          defaultValue={motorcycle.make}
        />
      </div>
      <div className="mb-5">
        <label
          htmlFor="model"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          Modell
        </label>
        <input
          type="text"
          name="model"
          className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
          placeholder="R 1200 GS"
          defaultValue={motorcycle.model}
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="vin"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          Fahrgestellnummer
        </label>
        <input
          type="text"
          name="vin"
          className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
          placeholder=""
          defaultValue={motorcycle.vin}
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="motorcycleId"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          Stammnummer
        </label>
        <input
          type="text"
          name="motorcycleId"
          className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
          placeholder=""
          defaultValue={motorcycle.vehicleIdNr}
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="firstRegistration"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          1. Inverkehrssetzung
        </label>
        <input
          type="date"
          name="firstRegistration"
          className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
          defaultValue={motorcycle.firstRegistration}
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="lastInspection"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          Letzte Inspektion
        </label>
        <input
          type="date"
          name="lastInspection"
          className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
          defaultValue={motorcycle.lastInspection ?? ""}
        />
      </div>

      <div className="w-full mt-4 ml-2 flex flex-row gap-2">
        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={navigation.state === "submitting"}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {navigation.state === "submitting" ? "Saving..." : "Save"}
        </button>
        {/* DELETE BUTTON */}
        <button
          type="submit"
          name="intent"
          value="delete"
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Delete
        </button>
        {/* CANCEL BUTTON */}
        <Link
          to="/"
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded inline-block"
        >
          Cancel
        </Link>
      </div>
    </Form>
  );
}
