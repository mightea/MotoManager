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
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronUp, Calendar, Gauge, Wrench, Sprout } from "lucide-react";

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
  const { motorcycle, maintenance: maintenanceEntries } = loaderData;
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
  return (
    <div className="flex flex-col pt-2 px-4">
      <div className="flex flex-col gap-2 bg-white dark:bg-gray-800">
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

        {/* Motorcycle Details Section */}
        <section className="mb-8 bg-gray-50 dark:bg-gray-700 p-5 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-300">
          <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-600">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 transition-colors duration-300">
              Fahrzeugdetails
            </h2>
            {/* Edit Button for Vehicle Details */}
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 px-4 rounded-full text-sm shadow-md transition-colors duration-300"
              aria-label="Fahrzeugdetails bearbeiten"
            >
              Bearbeiten
            </button>
          </div>
        </section>

        {/* Maintenance History Section */}
        <section className="">
          {/* Maintenance Log */}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight flex items-center mb-4">
              <Wrench className="w-6 h-6 mr-3 text-sky-400" />
              Wartungsprotokoll
            </h2>
            {/* New Entry Button for Maintenance History */}
            <button
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-4 rounded-full text-sm shadow-md transition-colors duration-300"
              aria-label="Neuen Wartungseintrag hinzufügen"
            >
              Neuer Eintrag
            </button>

            <div className="w-full rounded-2xl bg-slate-800/50 p-2 space-y-2">
              {maintenanceEntries
                .slice()
                .reverse()
                .map((entry) => (
                  <Disclosure key={entry.id}>
                    {({ open }) => (
                      <>
                        <Disclosure.Button className="flex w-full justify-between items-center rounded-lg bg-sky-900/50 px-4 py-3 text-left text-sm font-medium text-sky-300 hover:bg-sky-800/50 focus:outline-none focus-visible:ring focus-visible:ring-sky-500 focus-visible:ring-opacity-75 transition-all duration-300">
                          <div className="flex-grow">
                            <span className="text-base">{entry.title}</span>
                            <span className="text-xs text-slate-400 block mt-1">
                              {new Date(entry.date).toLocaleDateString("de-DE")}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-mono text-slate-300">
                              {entry.odo.toLocaleString("de-DE")} km
                            </span>
                            <ChevronUp
                              className={`${
                                open ? "rotate-180 transform" : ""
                              } h-5 w-5 text-sky-400 transition-transform duration-300`}
                            />
                          </div>
                        </Disclosure.Button>
                        <Transition
                          enter="transition duration-100 ease-out"
                          enterFrom="transform scale-95 opacity-0"
                          enterTo="transform scale-100 opacity-100"
                          leave="transition duration-75 ease-out"
                          leaveFrom="transform scale-100 opacity-100"
                          leaveTo="transform scale-95 opacity-0"
                        >
                          <Disclosure.Panel className="px-4 pt-2 pb-4 text-sm text-slate-300 bg-slate-900/20 rounded-b-lg">
                            {entry.description}
                          </Disclosure.Panel>
                        </Transition>
                      </>
                    )}
                  </Disclosure>
                ))}
            </div>
          </div>
        </section>

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
