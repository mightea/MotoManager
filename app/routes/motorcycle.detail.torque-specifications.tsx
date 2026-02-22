import {
  data,
  useParams,
  useLocation,
  useActionData,
  useSubmit,
} from "react-router";
import type { Route } from "./+types/motorcycle.detail.torque-specifications";
import { getDb } from "~/db";
import {
  motorcycles,
  torqueSpecs,
  locations,
  maintenanceRecords,
  type TorqueSpecification,
} from "~/db/schema";
import { eq, desc, ne, inArray } from "drizzle-orm";
import { requireUser, mergeHeaders } from "~/services/auth.server";
import { getNextInspectionInfo } from "~/utils/inspection";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { Wrench, Plus, Pencil, Import, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { TorqueSpecForm } from "~/components/torque-spec-form";
import { ImportTorqueSpecsDialog } from "~/components/import-torque-specs-dialog";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { 
  createTorqueSpecification, 
  updateTorqueSpecification,
  deleteTorqueSpecification 
} from "~/db/providers/motorcycles.server";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.motorcycle) {
    return [{ title: "Anzugsmomente - Moto Manager" }];
  }
  const { make, model } = data.motorcycle;
  return [
    { title: `Anzugsmomente: ${make} ${model} - Moto Manager` },
    { name: "description", content: `Drehmoment-Spezifikationen für ${make} ${model}.` },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const db = await getDb();

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = Number(params.id);
  if (!Number.isFinite(motorcycleId)) {
    throw new Response("Invalid motorcycle ID", { status: 400 });
  }

  const motorcycle = await db.query.motorcycles.findFirst({
    where: eq(motorcycles.id, motorcycleId),
  });

  if (!motorcycle) {
    throw new Response("Motorcycle not found", { status: 404 });
  }

  if (motorcycle.userId !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const maintenanceHistory = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.motorcycleId, motorcycleId),
    orderBy: [desc(maintenanceRecords.date)],
  });

  const lastInspection =
    maintenanceHistory
      .filter((entry) => entry.type === "inspection" && entry.date)
      .map((entry) => entry.date as string)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .at(0) ?? null;

  const nextInspection = getNextInspectionInfo({
    firstRegistration: motorcycle.firstRegistration,
    lastInspection,
    isVeteran: motorcycle.isVeteran ?? false,
  });

  const userLocations = await db.query.locations.findMany({
    where: eq(locations.userId, user.id),
  });

  const currentLocationId = maintenanceHistory
    .filter((record) => record.type === "location")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    ?.locationId;

  const currentLocationName =
    userLocations.find((loc) => loc.id === currentLocationId)?.name ?? null;

  const specs = await db.query.torqueSpecs.findMany({
    where: eq(torqueSpecs.motorcycleId, motorcycleId),
    orderBy: [torqueSpecs.category, torqueSpecs.name],
  });

  // 1. Find all torque specs that belong to *other* motorcycles
  const otherSpecs = await db.query.torqueSpecs.findMany({
    where: ne(torqueSpecs.motorcycleId, motorcycleId),
  });

  // 2. Extract unique motorcycle IDs that actually have specs
  const otherMotorcycleIds = Array.from(new Set(otherSpecs.map(s => s.motorcycleId)));

  // 3. Fetch only those motorcycles
  const otherMotorcycles = otherMotorcycleIds.length > 0
    ? await db.query.motorcycles.findMany({
      where: inArray(motorcycles.id, otherMotorcycleIds),
      columns: {
        id: true,
        make: true,
        model: true,
        modelYear: true,
      }
    })
    : [];

  const allCategories = Array.from(new Set([
    ...specs.map(s => s.category),
    ...otherSpecs.map(s => s.category),
  ])).sort();

  return data({
    motorcycle,
    nextInspection,
    currentLocationName,
    specs,
    otherMotorcycles,
    otherSpecs,
    allCategories,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const db = await getDb();

  if (intent === "createTorqueSpec" || intent === "updateTorqueSpec" || intent === "importTorqueSpecs" || intent === "deleteTorqueSpec") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    // Security check: Ensure user owns the target motorcycle
    const motorcycle = await db.query.motorcycles.findFirst({
      where: eq(motorcycles.id, motorcycleId),
    });

    if (!motorcycle || motorcycle.userId !== user.id) {
      return data({ error: "Nicht autorisiert." }, { status: 403, headers: mergeHeaders(headers) });
    }

    if (intent === "deleteTorqueSpec") {
      const torqueId = Number(formData.get("torqueId"));
      if (!torqueId) {
        return data({ error: "ID fehlt für Löschen." }, { status: 400, headers: mergeHeaders(headers) });
      }
      await deleteTorqueSpecification(db, torqueId, motorcycleId);
      return data({ success: true }, { headers: mergeHeaders(headers) });
    }

    if (intent === "importTorqueSpecs") {
      const sourceSpecIds = formData.getAll("sourceSpecIds").map(Number);
      if (sourceSpecIds.length === 0) {
        return data({ success: true }, { headers: mergeHeaders(headers) });
      }

      const sourceSpecs = await db.query.torqueSpecs.findMany({
        where: inArray(torqueSpecs.id, sourceSpecIds),
      });

      const existingSpecs = await db.query.torqueSpecs.findMany({
        where: eq(torqueSpecs.motorcycleId, motorcycleId),
      });

      const importPromises = sourceSpecs.map(async (src) => {
        // Check for existing by category + name (case insensitive ideally, but exact for now)
        const existing = existingSpecs.find(
          e => e.category === src.category && e.name === src.name
        );

        const newValues = {
          motorcycleId,
          category: src.category,
          name: src.name,
          torque: src.torque,
          torqueEnd: src.torqueEnd,
          variation: src.variation,
          toolSize: src.toolSize,
          description: src.description,
        };

        if (existing) {
          await updateTorqueSpecification(db, existing.id, motorcycleId, newValues);
        } else {
          await createTorqueSpecification(db, newValues);
        }
      });
      await Promise.all(importPromises);
      return data({ success: true }, { headers: mergeHeaders(headers) });
    }

    const category = formData.get("category") as string;
    const name = formData.get("name") as string;
    const torque = Number(formData.get("torque"));

    // Optional fields
    const torqueEndRaw = formData.get("torqueEnd");
    const torqueEnd = torqueEndRaw ? Number(torqueEndRaw) : undefined;

    const variationRaw = formData.get("variation");
    const variation = variationRaw ? Number(variationRaw) : undefined;

    const toolSize = formData.get("toolSize") as string | undefined;
    const description = formData.get("description") as string | undefined;

    if (!motorcycleId || !category || !name || isNaN(torque)) {
      return data({ error: "Bitte alle Pflichtfelder ausfüllen." }, { status: 400, headers: mergeHeaders(headers) });
    }

    if (intent === "createTorqueSpec") {
      await createTorqueSpecification(db, {
        motorcycleId,
        category,
        name,
        torque,
        torqueEnd,
        variation,
        toolSize,
        description,
      });
    } else {
      const torqueId = Number(formData.get("torqueId"));
      if (!torqueId) {
        return data({ error: "ID fehlt für Update." }, { status: 400, headers: mergeHeaders(headers) });
      }
      await updateTorqueSpecification(db, torqueId, motorcycleId, {
        category,
        name,
        torque,
        torqueEnd: torqueEnd ?? null,
        variation: variation ?? null,
        toolSize: toolSize ?? null,
        description: description ?? null,
      });
    }

    return data({ success: true }, { headers: mergeHeaders(headers) });
  }

  return null;
}

export default function MotorcycleTorqueSpecificationsPage({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    nextInspection,
    currentLocationName,
    specs,
    otherMotorcycles,
    otherSpecs,
    allCategories,
  } = loaderData;
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug ?? createMotorcycleSlug(motorcycle.make, motorcycle.model);
  const motorcycleIdParam = params.id ?? motorcycle.id.toString();
  const basePath = `/motorcycle/${slug}/${motorcycleIdParam}`;
  const location = useLocation();
  const normalizePath = (path: string) => path.replace(/\/+$/, "");
  const overviewLink = {
    to: basePath,
    isActive: normalizePath(location.pathname) === normalizePath(basePath),
  };
  const navLinks = [
    { label: "Dokumente", to: `${basePath}/documents`, isActive: false },
    { label: "Anzugsmomente", to: `${basePath}/torque-specs`, isActive: true },
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<TorqueSpecification | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<TorqueSpecification | null>(null);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddModalOpen(false);
      setIsImportModalOpen(false);
      setEditingSpec(null);
      setDeletingSpec(null);
    }
  }, [actionData]);

  const handleDelete = () => {
    if (!deletingSpec) return;
    const formData = new FormData();
    formData.append("intent", "deleteTorqueSpec");
    formData.append("motorcycleId", motorcycle.id.toString());
    formData.append("torqueId", deletingSpec.id.toString());
    submit(formData, { method: "post" });
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-0 md:p-6 md:space-y-8 print:p-0 print:m-0 print:max-w-none">
      {/* Print Only Header */}
      <div className="hidden print:block border-b-2 border-gray-900 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-black">
              {motorcycle.make} {motorcycle.model}
            </h1>
            <p className="text-lg font-medium text-gray-700">Anzugsmomente & Spezifikationen</p>
          </div>
          <div className="text-right text-sm space-y-1 text-gray-600">
            <div>Gedruckt am: {new Date().toLocaleDateString("de-CH")}</div>
            <div>MotoManager v{process.env.APP_VERSION}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-500">Jahrgang</span>
            <span className="font-semibold text-black">{motorcycle.modelYear || "Unbekannt"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-500">Kennzeichen</span>
            <span className="font-semibold text-black">{motorcycle.numberPlate || "-"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-500">VIN</span>
            <span className="font-semibold text-black font-mono">{motorcycle.vin || "-"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-500">Stammnummer</span>
            <span className="font-semibold text-black font-mono">{motorcycle.vehicleIdNr || "-"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-500">1. Inverkehrssetzung</span>
            <span className="font-semibold text-black">{motorcycle.firstRegistration || "-"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-bold uppercase text-gray-500">Standort</span>
            <span className="font-semibold text-black">{currentLocationName || "-"}</span>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <MotorcycleDetailHeader
          motorcycle={motorcycle}
          nextInspection={nextInspection}
          currentLocationName={currentLocationName}
          navLinks={navLinks}
          backTo={basePath}
          overviewLink={overviewLink}
        />
      </div>

      <div className="space-y-6 print:space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-foreground dark:text-white">Anzugsmomente</h2>
            <p className="text-sm text-secondary dark:text-navy-400">
              Spezifikationen für {motorcycle.make} {motorcycle.model}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-all hover:bg-gray-50 hover:text-foreground dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700 dark:hover:text-white"
            >
              <Printer className="h-5 w-5" />
              Drucken
            </button>
            {otherMotorcycles.length > 0 && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-all hover:bg-gray-50 hover:text-foreground dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700 dark:hover:text-white"
              >
                <Import className="h-5 w-5" />
                Importieren
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Hinzufügen
            </button>
          </div>
        </div>

        {actionData && "error" in actionData && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 print:hidden">
            {actionData.error}
          </div>
        )}

        {specs.length === 0 ? (
          <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center dark:border-navy-700 dark:bg-navy-800/50 print:hidden">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gray-100 dark:bg-navy-700">
              <Wrench className="h-8 w-8 text-gray-400 dark:text-navy-300" />
            </div>
            <h3 className="text-xl font-semibold text-foreground dark:text-white">
              Keine Anzugsmomente vorhanden
            </h3>
            <p className="mt-2 max-w-sm text-secondary dark:text-navy-400">
              Es wurden noch keine Drehmoment-Spezifikationen für dieses Fahrzeug hinterlegt.
            </p>
            <div className="mt-6 flex gap-3">
              {otherMotorcycles.length > 0 && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-all hover:bg-gray-50 hover:text-foreground dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700 dark:hover:text-white"
                >
                  <Import className="h-5 w-5" />
                  Importieren
                </button>
              )}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Ersten Eintrag erstellen
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 print:gap-4">
            {/* Group by category */}
            {Array.from(new Set(specs.map(s => s.category))).map(category => (
              <div key={category} className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800 overflow-hidden print:shadow-none print:border-gray-300 print:rounded-none">
                <div className="bg-gray-50/80 backdrop-blur-sm px-5 py-3 border-b border-gray-100 dark:border-navy-700 font-bold text-xs uppercase tracking-widest text-secondary dark:bg-navy-900/50 dark:text-navy-300 print:bg-gray-100 print:text-black print:border-gray-300">
                  {category}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-navy-700 print:divide-gray-200">
                  {specs.filter(s => s.category === category).map(spec => (
                    <div key={spec.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-navy-700/30 print:flex-row print:py-3 print:bg-white print:text-black">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground dark:text-white leading-tight print:text-black print:text-sm">
                            {spec.name}
                          </h3>
                          <button
                            onClick={() => setEditingSpec(spec)}
                            className="rounded-lg p-1 text-secondary opacity-0 transition-all hover:bg-gray-100 hover:text-primary group-hover:opacity-100 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-primary-light focus:opacity-100 print:hidden"
                            title="Bearbeiten"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {spec.description && (
                          <p className="text-xs text-secondary dark:text-navy-400 max-w-xl italic print:text-gray-600 print:italic">
                            {spec.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t border-gray-50 pt-3 sm:border-0 sm:pt-0 dark:border-navy-700/50 print:border-0 print:pt-0">
                        {spec.toolSize ? (
                          <div className="flex flex-col items-center gap-1 print:items-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50 dark:text-navy-500 print:text-gray-500">Werkzeug</span>
                            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-foreground dark:bg-navy-900 dark:text-navy-100 border border-gray-200/60 dark:border-navy-700 shadow-sm print:bg-white print:border-gray-200 print:shadow-none print:px-0 print:py-0">
                              <Wrench className="h-3 w-3 text-secondary/70 dark:text-navy-400 print:hidden" />
                              <span className="print:text-sm">{spec.toolSize}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="hidden sm:block w-16 print:hidden" /> 
                        )}
                        
                        <div className="flex flex-col items-end min-w-[80px]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50 dark:text-navy-500 mb-1 print:text-gray-500">Drehmoment</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold tracking-tight text-foreground dark:text-white tabular-nums leading-none print:text-black print:text-lg">
                                {spec.torque}{spec.torqueEnd ? `–${spec.torqueEnd}` : ''}
                              </span>
                              {!spec.variation && (
                                <span className="text-xs font-bold text-secondary dark:text-navy-400 uppercase print:text-black">Nm</span>
                              )}
                            </div>
                            {spec.variation && (
                              <div className="flex items-baseline gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-100/50 dark:border-amber-900/30 tabular-nums whitespace-nowrap print:bg-white print:text-black print:border-none print:p-0">
                                <span>± {spec.variation}</span>
                                <span className="text-[9px] uppercase opacity-70 print:text-[10px] print:opacity-100">Nm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Anzugsmoment hinzufügen"
        description="Füge einen neuen Eintrag hinzu."
      >
        <TorqueSpecForm
          motorcycleId={motorcycle.id}
          existingCategories={allCategories}
          onClose={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(editingSpec)}
        onClose={() => setEditingSpec(null)}
        title="Anzugsmoment bearbeiten"
        description="Passe den Eintrag an."
      >
        {editingSpec && (
          <TorqueSpecForm
            motorcycleId={motorcycle.id}
            initialValues={editingSpec}
            existingCategories={allCategories}
            onClose={() => setEditingSpec(null)}
            onDelete={(spec) => setDeletingSpec(spec)}
          />
        )}
      </Modal>

      <DeleteConfirmationDialog
        isOpen={Boolean(deletingSpec)}
        title="Anzugsmoment löschen"
        description={`Möchtest du das Anzugsmoment "${deletingSpec?.name}" wirklich löschen?`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSpec(null)}
      />

      <ImportTorqueSpecsDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetMotorcycleId={motorcycle.id}
        otherMotorcycles={otherMotorcycles}
        otherSpecs={otherSpecs}
        existingSpecs={specs}
      />
    </div>
  );
}
