import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/edit-motorcycle";
import db from "~/db";
import { motorcycles, type EditorMotorcycle } from "~/db/schema";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { Checkbox, RadioGroup } from "@headlessui/react";
import { InputField } from "~/components/form/InputField";

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
    licenseType: formData.get("licenseType") === "true" ? "veteran" : "regular",
    firstRegistration: formData.get("firstRegistration") as string,
    lastInspection: formData.get("lastInspection") as string,
    initialOdo: parseInt(formData.get("initialOdo") as string),
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
      className="flex flex-col gap-4 m-4"
      method="post"
      id={motorcycle.id.toString()}
    >
      <InputField
        name="make"
        label="Marke"
        type="text"
        placeholder="BMW"
        defaultValue={motorcycle.make}
      />

      <InputField
        name="model"
        label="Modell"
        type="text"
        placeholder="R 90 S"
        defaultValue={motorcycle.model}
      />

      <InputField
        type="text"
        name="vin"
        label="Fahrgestellnummer"
        placeholder=""
        defaultValue={motorcycle.vin}
      />

      <InputField
        type="text"
        name="motorcycleId"
        label="Stammnummer"
        placeholder=""
        defaultValue={motorcycle.vehicleIdNr}
      />

      <InputField
        type="date"
        name="firstRegistration"
        label="1. Inverkehrssetzung"
        defaultValue={motorcycle.firstRegistration}
      />

      <InputField
        type="number"
        name="initialOdo"
        label="Initialer Kilometerstand"
        placeholder="0"
        defaultValue={motorcycle.initialOdo}
      />

      <InputField
        type="date"
        name="lastInspection"
        label="Letzte Inspektion"
        defaultValue={motorcycle.lastInspection ?? ""}
      />

      <div className="mb-5">
        <label htmlFor="licenseType" className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            className="size-5 rounded border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:ring-offset-gray-900 dark:checked:bg-blue-600"
            id="licenseType"
            defaultChecked={motorcycle.licenseType === "veteran"}
          />

          <span className="font-medium text-gray-700 dark:text-gray-200">
            Veteranenfahrzeug
          </span>
        </label>
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
