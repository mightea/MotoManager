import { Form, Link } from "react-router";
import type { Route } from "./+types/motorcycle";
import db from "~/db";
import { maintenance, motorcycles, type Motorcycle } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import { useState } from "react";
import Modal from "~/components/Modal";
import { InputField } from "~/components/form/InputField";
import { Select } from "@headlessui/react";
import { useTheme } from "~/contexts/ThemeProvider";
import { isTruthy } from "~/utils/falsyUtils";

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

  const maintenanceItems = await db.query.maintenance.findMany({
    where: eq(maintenance.motorcycleId, motorcycleId),
    orderBy: [
      desc(maintenance.date), // Order by date descending
    ],
  });

  return { motorcycle: result, maintenance: maintenanceItems };
}

export default function Motorcycle({ loaderData }: Route.ComponentProps) {
  const { motorcycle, maintenance } = loaderData;
  const { id, make, model, vin } = motorcycle;

  const entries: [string, string][] = [
    ["Fahrgestellnummer", vin],
    ["Stammnummer", motorcycle.vehicleIdNr],
    ["Erstzulassung", motorcycle.firstRegistration],
    ["Letzte Inspektion", String(motorcycle.lastInspection)],
    ["Kilometerstand", motorcycle.initialOdo.toString()],
  ];

  const [isBasicModalOpen, setIsBasicModalOpen] = useState(false);

  function closeBasicModal() {
    setIsBasicModalOpen(false);
  }

  function openBasicModal() {
    setIsBasicModalOpen(true);
  }

  const sampleOptions = [
    { id: 1, name: "Option 1" },
    { id: 2, name: "Option 2" },
    { id: 3, name: "Option 3" },
  ];

  const [selectedOption, setSelectedOption] = useState(sampleOptions[0]);
  const { theme } = useTheme(); // Use the theme from your context

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

        <Link
          to={`/motorcycle/${id}/edit`}
          className="rounded-md bg-blue-600 text-center px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Bearbeiten
        </Link>

        <button
          type="button"
          onClick={openBasicModal}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Eintrag hinzufügen
        </button>

        {/* Mobile List View */}
        <div className="block md:hidden space-y-4">
          {" "}
          {/* space-y-4 adds vertical spacing between cards */}
          {maintenance.map((row) => (
            <div
              key={row.id}
              className="shadow-md rounded-lg p-4 border border-gray-600"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg text-gray-600">
                  Typ: {row.type}
                </span>
                <span className="text-sm text-gray-600">Date: {row.date}</span>
              </div>
              <div className="">
                <div className="flex flex-row gap-2 items-stretch">
                  <p className="text-gray-500 dark:text-gray-400 text-sm grow">
                    Kilometerstand:
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm align-right">
                    {row.odo}
                  </p>
                </div>
                <div className="flex flex-row gap-2 items-stretch">
                  <p className="text-gray-500 dark:text-gray-400 text-sm grow">
                    Kosten:
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm align-right">
                    {row.cost} {row.currency}
                  </p>
                </div>
                {isTruthy(row.description?.trim()) && (
                  <div className="flex flex-col gap-2 items-stretch">
                    <p className="text-gray-500 dark:text-gray-400 text-sm grow">
                      Beschreibung:
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm align-right">
                      {row.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Basic Modal */}
        <Modal
          isOpen={isBasicModalOpen}
          onClose={closeBasicModal}
          title="Add issue"
        >
          <p className="text-sm text-gray-500">Neuen Eintrag hinzufügen</p>

          <Form
            className="flex flex-col gap-4 m-4"
            method="post"
            id={motorcycle.id.toString()}
          >
            <Select>
              <option value="tire">Reifen</option>
              <option value="battery">Batterie</option>
              <option value="engineoil">Motoröl</option>
              <option value="gearboxoil">Getriebeöl</option>
              <option value="forkoil">Gabelöl</option>
              <option value="breakfluid">Bremsflüssigkeit</option>
              <option value="brakepad">Bremsbeläge</option>
              <option value="chain">Kette</option>
              <option value="brakerotor">Bremsscheibe</option>
              <option value="other">Sonstiges</option>
            </Select>
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
            />
          </Form>
        </Modal>
      </div>
    </div>
  );
}
