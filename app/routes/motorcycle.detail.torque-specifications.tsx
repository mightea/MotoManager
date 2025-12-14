import {
  data,
  useParams,
  useLocation,
  Form,
  useActionData,
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
import { eq, desc, ne, inArray, and } from "drizzle-orm";
import { requireUser, mergeHeaders } from "~/services/auth.server";
import { getNextInspectionInfo } from "~/utils/inspection";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { Wrench, Plus, Pencil, Import } from "lucide-react";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { TorqueSpecForm } from "~/components/torque-spec-form";
import { ImportTorqueSpecsDialog } from "~/components/import-torque-specs-dialog";
import { createTorqueSpecification, updateTorqueSpecification } from "~/db/providers/motorcycles.server";

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

  const otherMotorcycles = await db.query.motorcycles.findMany({
    where: ne(motorcycles.id, motorcycleId),
    columns: {
        id: true,
        make: true,
        model: true,
        modelYear: true,
    }
  });

  const otherSpecs = await db.query.torqueSpecs.findMany({
    where: inArray(torqueSpecs.motorcycleId, otherMotorcycles.map(m => m.id)),
  });

  return data({
    motorcycle,
    nextInspection,
    currentLocationName,
    specs,
    otherMotorcycles,
    otherSpecs,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const db = await getDb();

  if (intent === "createTorqueSpec" || intent === "updateTorqueSpec" || intent === "importTorqueSpecs") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    
    // Security check: Ensure user owns the target motorcycle
    const motorcycle = await db.query.motorcycles.findFirst({
        where: eq(motorcycles.id, motorcycleId),
    });

    if (!motorcycle || motorcycle.userId !== user.id) {
        return data({ error: "Nicht autorisiert." }, { status: 403, headers: mergeHeaders(headers) });
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

        for (const src of sourceSpecs) {
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
        }
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
  } = loaderData;
  const actionData = useActionData<typeof action>();
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

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      setIsAddModalOpen(false);
      setIsImportModalOpen(false);
      setEditingSpec(null);
    }
  }, [actionData]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-0 md:p-6 md:space-y-8">
      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        backTo={basePath}
        overviewLink={overviewLink}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-2xl font-bold text-foreground dark:text-white">Anzugsmomente</h2>
                <p className="text-sm text-secondary dark:text-navy-400">
                Spezifikationen für {motorcycle.make} {motorcycle.model}
                </p>
            </div>
            <div className="flex items-center gap-2">
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
             <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
             {actionData.error}
           </div>
        )}

        {specs.length === 0 ? (
          <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center dark:border-navy-700 dark:bg-navy-800/50">
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
          <div className="grid gap-6">
            {/* Group by category */}
            {Array.from(new Set(specs.map(s => s.category))).map(category => (
                <div key={category} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 font-semibold text-foreground dark:bg-navy-900/50 dark:text-white">
                        {category}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-navy-700">
                        {specs.filter(s => s.category === category).map(spec => (
                            <div key={spec.id} className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-navy-700/50">
                                <div className="space-y-0.5">
                                    <div className="font-medium text-foreground dark:text-white">{spec.name}</div>
                                    <div className="flex flex-wrap gap-2 text-xs text-secondary dark:text-navy-400">
                                      {spec.toolSize && (
                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium dark:bg-navy-700 dark:text-navy-200">
                                          {spec.toolSize}
                                        </span>
                                      )}
                                      {spec.description && <span>{spec.description}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-bold text-foreground dark:text-white">
                                            {spec.torque}{spec.torqueEnd ? ` - ${spec.torqueEnd}` : ''} Nm
                                        </div>
                                        {spec.variation && (
                                            <div className="text-xs text-secondary dark:text-navy-400">
                                                ± {spec.variation} Nm
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setEditingSpec(spec)}
                                        className="rounded-lg p-2 text-secondary opacity-0 transition-all hover:bg-gray-100 hover:text-primary group-hover:opacity-100 dark:text-navy-400 dark:hover:bg-navy-600 dark:hover:text-primary-light"
                                        title="Bearbeiten"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
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
                onClose={() => setEditingSpec(null)}
            />
        )}
      </Modal>

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