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
} from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser, mergeHeaders } from "~/services/auth.server";
import { getNextInspectionInfo } from "~/utils/inspection";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { Wrench, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Modal } from "~/components/modal";
import { AddTorqueSpecForm } from "~/components/add-torque-spec-form";
import { createTorqueSpecification } from "~/db/providers/motorcycles.server";

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

  return data({
    motorcycle,
    nextInspection,
    currentLocationName,
    specs,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const db = await getDb();

  if (intent === "createTorqueSpec") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const category = formData.get("category") as string;
    const name = formData.get("name") as string;
    const torque = Number(formData.get("torque"));
    
    // Optional fields
    const torqueEndRaw = formData.get("torqueEnd");
    const torqueEnd = torqueEndRaw ? Number(torqueEndRaw) : undefined;
    
    const variationRaw = formData.get("variation");
    const variation = variationRaw ? Number(variationRaw) : undefined;
    
    const description = formData.get("description") as string | undefined;

    if (!motorcycleId || !category || !name || isNaN(torque)) {
      return data({ error: "Bitte alle Pflichtfelder ausfüllen." }, { status: 400, headers: mergeHeaders(headers) });
    }

    // Security check: Ensure user owns the motorcycle
    const motorcycle = await db.query.motorcycles.findFirst({
        where: eq(motorcycles.id, motorcycleId),
    });

    if (!motorcycle || motorcycle.userId !== user.id) {
        return data({ error: "Nicht autorisiert." }, { status: 403, headers: mergeHeaders(headers) });
    }

    await createTorqueSpecification(db, {
        motorcycleId,
        category,
        name,
        torque,
        torqueEnd,
        variation,
        description,
    });

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

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      setIsAddModalOpen(false);
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
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-foreground dark:text-white">Anzugsmomente</h2>
                <p className="text-sm text-secondary dark:text-navy-400">
                Spezifikationen für {motorcycle.make} {motorcycle.model}
                </p>
            </div>
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
            >
                <Plus className="h-5 w-5" />
                Hinzufügen
            </button>
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
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
            >
                <Plus className="h-5 w-5" />
                Ersten Eintrag erstellen
            </button>
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
                            <div key={spec.id} className="flex items-center justify-between px-4 py-3">
                                <div className="space-y-0.5">
                                    <div className="font-medium text-foreground dark:text-white">{spec.name}</div>
                                    {spec.description && (
                                        <div className="text-xs text-secondary dark:text-navy-400">{spec.description}</div>
                                    )}
                                </div>
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
        <AddTorqueSpecForm
            motorcycleId={motorcycle.id}
            onClose={() => setIsAddModalOpen(false)}
        />
      </Modal>
    </div>
  );
}