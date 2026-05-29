import {
  data,
  useParams,
  useLocation,
  useActionData,
  useSubmit,
} from "react-router";
import type { Route } from "./+types/motorcycle.detail.torque-specifications";
import {
  type PressureUnit,
  type TirePressure,
  type TorqueSpecification,
} from "~/types/db";
import { requireUser } from "~/services/auth";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { Gauge, Wrench, Plus, Pencil, Import, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { Modal } from "~/components/modal";
import { TorqueSpecForm } from "~/components/torque-spec-form";
import { TirePressureForm } from "~/components/tire-pressure-form";
import { TirePressureCard } from "~/components/tire-pressure-card";
import { ImportTorqueSpecsDialog } from "~/components/import-torque-specs-dialog";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { Card } from "~/components/card";
import { EmptyState } from "~/components/empty-state";
import {
  createTorqueSpecification,
  deleteTirePressure,
  deleteTorqueSpecification,
  getTirePressure,
  updateTorqueSpecification,
  upsertTirePressure,
} from "~/services/motorcycles";
import { fetchFromBackend } from "~/utils/backend";
import { computeMotorcycleHeaderStats } from "~/utils/motorcycle-header-stats";
import { formatPressure } from "~/utils/pressure";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.motorcycle) {
    return [{ title: "Werkstattdaten - Moto Manager" }];
  }
  const { make, model } = data.motorcycle;
  return [
    { title: `Werkstattdaten: ${make} ${model} - Moto Manager` },
    { name: "description", content: `Reifendruck & Anzugsmomente für ${make} ${model}.` },
  ];
}

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = Number(params.id);
  if (!Number.isFinite(motorcycleId)) {
    throw new Response("Invalid motorcycle ID", { status: 400 });
  }

  const [response, allMotorcyclesResponse, tirePressure] = await Promise.all([
    fetchFromBackend<any>(`/motorcycles/${motorcycleId}`, {}, token),
    fetchFromBackend<{ motorcycles: any[] }>(`/motorcycles`, {}, token),
    getTirePressure(token, motorcycleId),
  ]);

  const otherMotorcycles = (allMotorcyclesResponse.motorcycles ?? [])
    .filter((m: any) => m.id !== motorcycleId)
    .map((m: any) => ({
      id: m.id,
      make: m.make,
      model: m.model,
      fabricationDate: m.fabricationDate ?? m.modelYear ?? null,
    }));

  const otherSpecsResponses = await Promise.all(
    otherMotorcycles.map((m) =>
      fetchFromBackend<{ torqueSpecs: TorqueSpecification[] }>(
        `/motorcycles/${m.id}/torque-specs`,
        {},
        token,
      ).catch(() => ({ torqueSpecs: [] as TorqueSpecification[] })),
    ),
  );
  const otherSpecs = otherSpecsResponses.flatMap((r) => r.torqueSpecs ?? []);

  const headerStats = await computeMotorcycleHeaderStats(response, token, user.id);

  return data({
    ...response,
    ...headerStats,
    tirePressure,
    allMotorcycles: otherMotorcycles,
    otherSpecs,
    printDate: new Date().toLocaleDateString("de-CH"),
  });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user: _user, token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upsertTirePressure") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const frontBar = Number(formData.get("frontBar"));
    const rearBar = Number(formData.get("rearBar"));
    const preferredUnitRaw = String(formData.get("preferredUnit") ?? "bar");
    const preferredUnit: PressureUnit = preferredUnitRaw === "psi" ? "psi" : "bar";
    const sidecarRaw = formData.get("sidecarBar");
    const sidecarBar = sidecarRaw == null || sidecarRaw === "" ? null : Number(sidecarRaw);

    if (!motorcycleId || !Number.isFinite(frontBar) || !Number.isFinite(rearBar)) {
      return data({ error: "Bitte Vorder- und Hinterreifen-Druck angeben." }, { status: 400 });
    }
    if (sidecarBar != null && !Number.isFinite(sidecarBar)) {
      return data({ error: "Beiwagen-Druck ist ungültig." }, { status: 400 });
    }

    await upsertTirePressure(token, motorcycleId, {
      frontBar,
      rearBar,
      sidecarBar,
      preferredUnit,
    });
    return data({ success: true });
  }

  if (intent === "deleteTirePressure") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    if (!motorcycleId) {
      return data({ error: "Motorrad-ID fehlt." }, { status: 400 });
    }
    const deleted = await deleteTirePressure(token, motorcycleId);
    if (!deleted) {
      return data({ error: "Reifendruck konnte nicht gelöscht werden." }, { status: 404 });
    }
    return data({ success: true });
  }

  if (intent === "createTorqueSpec" || intent === "updateTorqueSpec" || intent === "importTorqueSpecs" || intent === "deleteTorqueSpec") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    if (intent === "deleteTorqueSpec") {
      const torqueId = Number(formData.get("torqueId"));
      if (!torqueId) {
        return data({ error: "ID fehlt für Löschen." }, { status: 400 });
      }
      const deleted = await deleteTorqueSpecification(token, torqueId, motorcycleId);
      if (!deleted) {
        return data(
          { error: "Drehmoment-Spezifikation nicht gefunden oder gehört nicht zu diesem Motorrad." },
          { status: 404 },
        );
      }
      return data({ success: true });
    }

    if (intent === "importTorqueSpecs") {
      const sourceSpecIds = formData.getAll("sourceSpecIds").map(Number);
      if (sourceSpecIds.length === 0) {
        return data({ success: true });
      }

      await fetchFromBackend(`/motorcycles/${motorcycleId}/torque-specs/import`, {
        method: "POST",
        body: JSON.stringify({ sourceSpecIds }),
      }, token);

      return data({ success: true });
    }

    const category = formData.get("category") as string;
    const name = formData.get("name") as string;
    const torque = Number(formData.get("torque"));

    const torqueEndRaw = formData.get("torqueEnd");
    const torqueEnd = torqueEndRaw ? Number(torqueEndRaw) : undefined;

    const variationRaw = formData.get("variation");
    const variation = variationRaw ? Number(variationRaw) : undefined;

    const toolSize = formData.get("toolSize") as string | undefined;
    const description = formData.get("description") as string | undefined;

    if (!motorcycleId || !category || !name || isNaN(torque)) {
      return data({ error: "Bitte alle Pflichtfelder ausfüllen." }, { status: 400 });
    }

    if (intent === "createTorqueSpec") {
      await createTorqueSpecification(token, {
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
        return data({ error: "ID fehlt für Update." }, { status: 400 });
      }
      await updateTorqueSpecification(token, torqueId, motorcycleId, {
        category,
        name,
        torque,
        torqueEnd: torqueEnd ?? null,
        variation: variation ?? null,
        toolSize: toolSize ?? null,
        description: description ?? null,
      });
    }

    return data({ success: true });
  }

  return null;
}

export default function MotorcycleTorqueSpecificationsPage({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    nextInspection,
    currentLocationName,
    torqueSpecs: specsRaw = [],
    tirePressure,
    allMotorcycles: otherMotorcycles = [],
    otherSpecs = [],
    printDate,
  } = loaderData;
  const pressure = (tirePressure ?? null) as TirePressure | null;

  const specs = specsRaw as TorqueSpecification[];
  const allCategories = Array.from(new Set(specs.map((s: any) => s.category as string))).sort() as string[];
  const actionData = useActionData<typeof clientAction>();
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
    { label: "Werkstattdaten", to: `${basePath}/torque-specs`, isActive: true },
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<TorqueSpecification | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<TorqueSpecification | null>(null);
  const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddModalOpen(false);
      setIsImportModalOpen(false);
      setEditingSpec(null);
      setDeletingSpec(null);
      setIsPressureModalOpen(false);
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
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 md:space-y-6 print:p-0 print:m-0 print:max-w-none print:!bg-white print:!text-black print:pb-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1.5cm; }
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          body { 
            background-color: white !important; 
            color: black !important; 
          }
          /* Fix for dark mode backgrounds bleeding into print */
          .dark, .dark * {
            background-color: transparent !important;
            color: black !important;
            border-color: #d1d5db !important; /* gray-300 */
            box-shadow: none !important;
          }
          .print-force-white, 
          .dark .print-force-white,
          .dark [class*="bg-white"] {
            background-color: white !important;
          }
          .print-force-gray,
          .dark .print-force-gray {
            background-color: #f3f4f6 !important; /* gray-100 */
          }
          .print-no-blur { 
            backdrop-filter: none !important; 
            -webkit-backdrop-filter: none !important; 
          }
        }
      ` }} />

      {/* Print Only Header */}
      <div className="hidden print:block print:!bg-white print:border-black print:pb-4 print:mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold !text-black">
              {motorcycle.make} {motorcycle.model}
            </h1>
            <p className="text-lg font-medium !text-gray-800">Anzugsmomente & Spezifikationen</p>
          </div>
          <div className="text-right text-xs space-y-1 !text-gray-600">
            <div suppressHydrationWarning>Gedruckt am: {printDate}</div>
            <div>MotoManager v{process.env.APP_VERSION}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          {[
            { label: "Fabrikationsdatum", value: motorcycle.fabricationDate || "Unbekannt" },
            { label: "Kennzeichen", value: motorcycle.numberPlate || "-" },
            { label: "VIN", value: motorcycle.vin || "-", mono: true },
            { label: "Motor-Nummer", value: motorcycle.engineNumber || "-", mono: true },
            { label: "Stammnummer", value: motorcycle.vehicleIdNr || "-", mono: true },
            { label: "1. Inverkehrssetzung", value: motorcycle.firstRegistration || "-" },
            { label: "Kaufdatum", value: motorcycle.purchaseDate || "-" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between border-b border-gray-200 pb-1 print:border-gray-300">
              <span className="font-bold uppercase !text-gray-500 text-[10px]">{item.label}</span>
              <span className={clsx("font-semibold !text-black", item.mono && "font-mono")}>{item.value}</span>
            </div>
          ))}
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

      <div className="space-y-6 print:space-y-0 print:bg-white">
        <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-base-content/15 bg-base-100 text-base-content/65 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
            title="Drucken"
            aria-label="Drucken"
          >
            <Printer className="h-4 w-4" />
          </button>
          {otherMotorcycles.length > 0 && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
            >
              <Import className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Importieren</span>
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Hinzufügen</span>
            <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
          </button>
        </div>

        {actionData && "error" in actionData && (
          <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10 print:hidden">
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] pt-0.5 opacity-70">ERR</span>
            <span>{actionData.error}</span>
          </div>
        )}

        {/* Reifendruck section */}
        <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
          <h2 className="label-tag print:!text-black">
            <span>Reifendruck</span>
          </h2>
          {pressure ? (
            <div className="print:hidden">
              <TirePressureCard pressure={pressure} onEdit={() => setIsPressureModalOpen(true)} />
            </div>
          ) : (
            <div className="print:hidden">
              <EmptyState
                size="sm"
                icon={Gauge}
                title="Noch nicht erfasst"
                description="Hinterlege die empfohlenen Reifendrücke für vorne, hinten und ggf. Beiwagen."
                action={
                  <button
                    type="button"
                    onClick={() => setIsPressureModalOpen(true)}
                    className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Reifendruck erfassen
                    <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
                  </button>
                }
              />
            </div>
          )}
          {/* Print-only inline table (the card renders only on-screen). */}
          {pressure && (
            <div className="hidden print:block print:rounded-none print:border-[1.5px] print:border-black print:mb-6">
              <div className="print:bg-gray-100 print:px-4 print:py-2 print:font-bold print:!text-black print:border-b-[1.5px] print:border-black print:text-[12px]">
                REIFENDRUCK
              </div>
              <div className="print:px-4 print:py-3 print:!text-black">
                <PressurePrintRow label="Vorne" bar={pressure.frontBar} preferred={pressure.preferredUnit} />
                <PressurePrintRow label="Hinten" bar={pressure.rearBar} preferred={pressure.preferredUnit} />
                {pressure.sidecarBar != null && (
                  <PressurePrintRow label="Beiwagen" bar={pressure.sidecarBar} preferred={pressure.preferredUnit} />
                )}
              </div>
            </div>
          )}
        </section>

        {/* Anzugsmomente section heading */}
        <h2 className="label-tag print:hidden">
          <span>Anzugsmomente</span>
        </h2>

        {specs.length === 0 ? (
          <div className="print:hidden">
            <EmptyState
              icon={Wrench}
              title="Keine Anzugsmomente"
              description="Es wurden noch keine Drehmoment-Spezifikationen für dieses Fahrzeug hinterlegt."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {otherMotorcycles.length > 0 && (
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                    >
                      <Import className="h-3.5 w-3.5" aria-hidden="true" />
                      Importieren
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Ersten Eintrag erstellen
                    <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="grid gap-6 print:block print:gap-0 print:!bg-white">
            {/* Group by category */}
            {Array.from(new Set((specs as any[]).map((s: any) => s.category))).map((category: any) => (
              <Card
                key={category as string}
                className="overflow-hidden print:block print:rounded-none print:border-[1.5px] print:border-black print:mb-6 print:break-inside-avoid print:print-force-white print:shadow-none"
              >
                <div className="border-b border-base-200 px-4 py-3 font-subdisplay text-sm text-base-content dark:border-navy-700 dark:text-white print-no-blur print:print-force-gray print:!text-black print:border-b-[1.5px] print:border-black print:text-[12px] print:py-2">
                  {category as string}
                </div>
                <div className="divide-y divide-base-200 dark:divide-navy-700 print:divide-gray-300">
                  {specs.filter((s: any) => s.category === category).map((spec: TorqueSpecification) => (
                    <div key={spec.id} className="group relative flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-4 transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30 print:flex print:items-center print:justify-between print:px-4 print:py-3 print:!bg-white print:!text-black print:border-0">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold leading-tight truncate text-foreground dark:text-white print:text-[14px] print:font-bold print:flex-1 print:mr-4 print:!text-black print:whitespace-normal print:overflow-visible">
                            {spec.name}
                          </h3>
                          <button
                            onClick={() => setEditingSpec(spec)}
                            className="rounded-sm p-1 text-base-content/55 sm:opacity-0 transition-all hover:bg-base-200 hover:text-primary group-hover:opacity-100 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-primary-light focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 print:hidden"
                            title="Bearbeiten"
                            aria-label="Eintrag bearbeiten"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                        {spec.description && (
                          <p className="mt-0.5 text-xs leading-snug text-base-content/65 dark:text-navy-400 max-w-xl truncate sm:whitespace-normal print:text-[11px] print:!text-gray-700 print:italic print:mt-0.5 print:block print:overflow-visible print:whitespace-normal">
                            {spec.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-3 sm:gap-8 shrink-0 print:flex print:gap-8 print:items-start print:text-right print:border-0 print:pt-0">
                        {spec.toolSize && (
                          <div className="flex flex-col items-end sm:gap-0.5">
                            <span className="hidden sm:block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45 dark:text-navy-500 print:block print:text-[10px] print:!text-gray-600 print:mb-0.5">Werkzeug</span>
                            <div className="flex items-center gap-1.5 rounded-sm border border-base-300 bg-base-100 px-2.5 py-1 font-numeric text-[11px] sm:text-xs font-semibold text-foreground dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100 print:!bg-white print:border-none print:shadow-none print:p-0 print:text-[14px] print:font-bold print:!text-black">
                              <Wrench className="h-3 w-3 text-base-content/55 dark:text-navy-400 print:hidden" aria-hidden="true" />
                              <span>{spec.toolSize}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col items-end min-w-[65px] sm:min-w-[80px]">
                          <span className="hidden sm:block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45 dark:text-navy-500 mb-0.5 print:block print:text-[10px] print:!text-gray-600">Drehmoment</span>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="font-numeric text-xl sm:text-2xl font-semibold tracking-tight text-foreground dark:text-white leading-none print:text-[14px] print:font-bold print:!text-black">
                                {spec.torque}{spec.torqueEnd ? `–${spec.torqueEnd}` : ''}
                              </span>
                              {!spec.variation && (
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400 print:!text-black print:text-sm">Nm</span>
                              )}
                            </div>
                            {spec.variation && (
                              <div className="inline-flex items-baseline gap-0.5 rounded-sm border border-[var(--color-workshop)]/40 bg-[var(--color-workshop)]/10 px-1.5 py-0.5 sm:px-2 sm:py-1 font-numeric text-[10px] sm:text-[11px] font-semibold text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)] whitespace-nowrap print:!bg-white print:!text-black print:border-none print:p-0">
                                <span className="print:text-[14px] print:font-bold">± {spec.variation}</span>
                                <span className="font-mono text-[9px] uppercase opacity-70 print:text-[10px] print:opacity-100">Nm</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
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

      <Modal
        isOpen={isPressureModalOpen}
        onClose={() => setIsPressureModalOpen(false)}
        title={pressure ? "Reifendruck bearbeiten" : "Reifendruck erfassen"}
        description={`Empfohlene Werte für ${motorcycle.make} ${motorcycle.model}.`}
      >
        <TirePressureForm
          motorcycleId={motorcycle.id}
          initialValues={pressure}
          onClose={() => setIsPressureModalOpen(false)}
          onSubmit={() => setIsPressureModalOpen(false)}
          onDelete={pressure ? () => setIsPressureModalOpen(false) : undefined}
        />
      </Modal>
    </div>
  );
}

function PressurePrintRow({
  label,
  bar,
  preferred,
}: {
  label: string;
  bar: number;
  preferred: PressureUnit;
}) {
  const f = formatPressure(bar, preferred);
  return (
    <div className="hidden print:flex print:justify-between print:py-1 print:!text-black print:text-[12px]">
      <span className="print:font-bold print:!text-black">{label}</span>
      <span className="print:!text-black">{f.primary} ({f.secondary})</span>
    </div>
  );
}
