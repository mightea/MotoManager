import {
  data,
  useParams,
  useLocation,
  useActionData,
  useSubmit,
} from "react-router";
import type { Route } from "./+types/motorcycle.detail.torque-specifications";
import {
  type Issue,
  type MaintenanceRecord,
  type Motorcycle,
  type MotorcycleDetail,
  type PressureUnit,
  type TirePressure,
  type TorqueSpecification,
} from "~/types/db";
import { requireUser } from "~/services/auth";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { buildMotorcycleHero } from "~/components/motorcycle-hero-stats";
import { LinkifiedText } from "~/components/linkified-text";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { Plus, Pencil, Import, Printer, AlertTriangle, Share2 } from "lucide-react";
import { FormattedText } from "~/components/formatted-text";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { Modal } from "~/components/modal";
import { TorqueSpecForm } from "~/components/torque-spec-form";
import { MotorcycleDetailForm } from "~/components/motorcycle-detail-form";
import { TirePressureForm } from "~/components/tire-pressure-form";
import { TirePressureCard } from "~/components/tire-pressure-card";
import {
  ImportTorqueSpecsDialog,
  type TorqueImportSource,
} from "~/components/import-torque-specs-dialog";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { Card } from "~/components/card";
import { Button } from "~/components/button";
import {
  createMotorcycleDetail,
  createTorqueSpecification,
  deleteMotorcycleDetail,
  deleteTirePressure,
  deleteTorqueSpecification,
  getTirePressure,
  listMotorcycleDetails,
  updateMotorcycleDetail,
  updateTorqueSpecification,
  upsertTirePressure,
} from "~/services/motorcycles";
import { fetchFromBackend } from "~/utils/backend";
import {
  fetchCatalogTorqueSpecs,
  importCatalogTorqueSpecs,
  removeCatalogContribution,
  shareTorqueSpecsToCatalog,
  translateCatalogTorqueError,
} from "~/services/catalog-torque-specs";
import { fetchModelSeries } from "~/services/parts";
import { modelSeriesDisplayName } from "~/types/parts";
import { formatShareDate, ownContribution } from "~/utils/catalog-torque-specs";
import { toast } from "~/hooks/use-toast";
import { computeMotorcycleHeaderStats } from "~/utils/motorcycle-header-stats";
import { formatPressure } from "~/utils/pressure";

/** Slice of the `/motorcycles/:id` payload this route consumes. */
interface MotorcycleDetailResponse {
  motorcycle: Motorcycle;
  torqueSpecs?: TorqueSpecification[];
  maintenanceRecords?: MaintenanceRecord[];
  issues?: Pick<Issue, "odo">[];
  previousOwners?: unknown[];
}

const SECTION_TITLE =
  "font-subdisplay text-[15px] uppercase tracking-[0.06em] text-base-content dark:text-white print:!text-black";
const TH =
  "border-b border-base-300 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:border-navy-700 dark:text-navy-300";
const EDIT_ICON_BUTTON =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-base-content/15 text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:text-navy-300 dark:hover:text-white print:hidden";

/** `/motorcycles` list entry; older backends sent `modelYear` instead of `fabricationDate`. */
type MotorcycleListItem = Motorcycle & { modelYear?: string | null };

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData || !loaderData.motorcycle) {
    return [{ title: "Werkstattdaten - Moto Manager" }];
  }
  const { make, model } = loaderData.motorcycle;
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

  const [response, allMotorcyclesResponse, tirePressure, motorcycleDetails] = await Promise.all([
    fetchFromBackend<MotorcycleDetailResponse>(`/motorcycles/${motorcycleId}`, {}, token),
    fetchFromBackend<{ motorcycles: MotorcycleListItem[] }>(`/motorcycles`, {}, token),
    getTirePressure(token, motorcycleId),
    listMotorcycleDetails(token, motorcycleId),
  ]);

  const otherMotorcycles = (allMotorcyclesResponse.motorcycles ?? [])
    .filter((m) => m.id !== motorcycleId)
    .map((m) => ({
      id: m.id,
      make: m.make,
      model: m.model,
      fabricationDate: m.fabricationDate ?? m.modelYear ?? null,
    }));

  // The per-motorcycle spec fetches, the catalog lookups and the header stats
  // are independent — run them together.
  const seriesId = response.motorcycle.seriesId ?? null;
  const [otherSpecsResponses, headerStats, catalog, modelSeries] = await Promise.all([
    Promise.all(
      otherMotorcycles.map((m) =>
        fetchFromBackend<{ torqueSpecs: TorqueSpecification[] }>(
          `/motorcycles/${m.id}/torque-specs`,
          {},
          token,
        ).catch(() => ({ torqueSpecs: [] as TorqueSpecification[] })),
      ),
    ),
    computeMotorcycleHeaderStats(response, token, user.id),
    // null = API without catalog torque values (older server) → feature hidden.
    seriesId != null ? fetchCatalogTorqueSpecs(token, seriesId) : Promise.resolve(null),
    seriesId != null ? fetchModelSeries(token).catch(() => []) : Promise.resolve([]),
  ]);
  const seriesNode = seriesId != null ? modelSeries.find((node) => node.id === seriesId) : undefined;
  const otherSpecs = otherSpecsResponses.flatMap((r) => r.torqueSpecs ?? []);
  const hero = buildMotorcycleHero({
    motorcycle: response.motorcycle,
    maintenanceRecords: response.maintenanceRecords,
    issues: response.issues,
    previousOwnerCount: response.previousOwners?.length ?? null,
    nextInspection: headerStats.nextInspection,
  });

  return data({
    ...response,
    ...headerStats,
    hero,
    tirePressure,
    motorcycleDetails,
    allMotorcycles: otherMotorcycles,
    otherSpecs,
    catalog,
    seriesName: seriesNode ? modelSeriesDisplayName(seriesNode) : null,
    printDate: new Date().toLocaleDateString("de-CH"),
  });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user: _user, token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upsertTirePressure") {
    const motorcycleId = Number(formData.get("motorcycleId"));
    const preferredUnitRaw = String(formData.get("preferredUnit") ?? "bar");
    const preferredUnit: PressureUnit = preferredUnitRaw === "psi" ? "psi" : "bar";
    // Every pressure is optional: absent/empty = not recorded (stored as
    // NULL). The backend enforces pair integrity and at-least-one-config.
    const optionalBar = (name: string): number | null => {
      const raw = formData.get(name);
      return raw == null || raw === "" ? null : Number(raw);
    };
    const frontBar = optionalBar("frontBar");
    const rearBar = optionalBar("rearBar");
    const frontPassengerBar = optionalBar("frontPassengerBar");
    const rearPassengerBar = optionalBar("rearPassengerBar");
    const frontOffroadBar = optionalBar("frontOffroadBar");
    const rearOffroadBar = optionalBar("rearOffroadBar");
    const sidecarBar = optionalBar("sidecarBar");
    const sidecarPassengerBar = optionalBar("sidecarPassengerBar");
    const sidecarOffroadBar = optionalBar("sidecarOffroadBar");

    const all = [
      frontBar,
      rearBar,
      frontPassengerBar,
      rearPassengerBar,
      frontOffroadBar,
      rearOffroadBar,
      sidecarBar,
      sidecarPassengerBar,
      sidecarOffroadBar,
    ];
    if (!motorcycleId || all.every((v) => v == null)) {
      return data({ error: "Bitte mindestens eine Konfiguration angeben." }, { status: 400 });
    }
    if (all.some((v) => v != null && !Number.isFinite(v))) {
      return data({ error: "Ein Druckwert ist ungültig." }, { status: 400 });
    }

    await upsertTirePressure(token, motorcycleId, {
      frontBar,
      rearBar,
      frontPassengerBar,
      rearPassengerBar,
      frontOffroadBar,
      rearOffroadBar,
      sidecarBar,
      sidecarPassengerBar,
      sidecarOffroadBar,
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

  if (
    intent === "importCatalogTorqueSpecs" ||
    intent === "shareTorqueSpecsToCatalog" ||
    intent === "removeCatalogContribution"
  ) {
    const motorcycleId = Number(formData.get("motorcycleId"));
    try {
      if (intent === "importCatalogTorqueSpecs") {
        const catalogSpecIds = formData.getAll("catalogSpecIds").map(Number).filter(Boolean);
        if (!motorcycleId || catalogSpecIds.length === 0) return data({ success: true });
        const { count, skipped } = await importCatalogTorqueSpecs(token, motorcycleId, catalogSpecIds);
        const message =
          `${count} ${count === 1 ? "Wert" : "Werte"} übernommen` +
          (skipped > 0 ? ` · ${skipped} bereits vorhanden` : "");
        return data({ success: true, message });
      }
      if (intent === "shareTorqueSpecsToCatalog") {
        if (!motorcycleId) return data({ error: "Motorrad-ID fehlt." }, { status: 400 });
        const { count } = await shareTorqueSpecsToCatalog(token, motorcycleId);
        return data({
          success: true,
          message: `${count} ${count === 1 ? "Wert" : "Werte"} im Modellkatalog geteilt`,
        });
      }
      const seriesId = Number(formData.get("seriesId"));
      if (!seriesId) return data({ error: "Katalog-Eintrag fehlt." }, { status: 400 });
      await removeCatalogContribution(token, seriesId);
      return data({ success: true, message: "Aus dem Modellkatalog entfernt" });
    } catch (error) {
      if (error instanceof Response) throw error;
      return data({ error: translateCatalogTorqueError(error) }, { status: 400 });
    }
  }

  if (intent === "createDetail" || intent === "updateDetail" || intent === "deleteDetail") {
    const motorcycleId = Number(formData.get("motorcycleId"));

    if (intent === "deleteDetail") {
      const detailId = Number(formData.get("detailId"));
      if (!detailId) {
        return data({ error: "ID fehlt für Löschen." }, { status: 400 });
      }
      const deleted = await deleteMotorcycleDetail(token, detailId, motorcycleId);
      if (!deleted) {
        return data(
          { error: "Detail nicht gefunden oder gehört nicht zu diesem Motorrad." },
          { status: 404 },
        );
      }
      return data({ success: true });
    }

    const title = String(formData.get("title") ?? "").trim();
    const value = String(formData.get("value") ?? "").trim();

    if (!motorcycleId || !title || !value) {
      return data({ error: "Bitte alle Pflichtfelder ausfüllen." }, { status: 400 });
    }

    if (intent === "createDetail") {
      await createMotorcycleDetail(token, { motorcycleId, title, value });
    } else {
      const detailId = Number(formData.get("detailId"));
      if (!detailId) {
        return data({ error: "ID fehlt für Update." }, { status: 400 });
      }
      await updateMotorcycleDetail(token, detailId, motorcycleId, { title, value });
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
    // "" clears the formatting server-side; absent would keep stale markup.
    const descriptionMarkup = (formData.get("descriptionMarkup") as string | null) ?? "";
    const unverified = formData.get("unverified") === "true";

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
        descriptionMarkup,
        unverified,
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
        descriptionMarkup,
        unverified,
      });
    }

    return data({ success: true });
  }

  return null;
}

export default function MotorcycleTorqueSpecificationsPage({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    hero,
    nextInspection,
    currentLocationName,
    torqueSpecs: specsRaw = [],
    tirePressure,
    motorcycleDetails: detailsRaw = [],
    allMotorcycles: otherMotorcycles = [],
    otherSpecs = [],
    catalog,
    seriesName,
    printDate,
  } = loaderData;
  const pressure = (tirePressure ?? null) as TirePressure | null;

  const specs = specsRaw as TorqueSpecification[];
  const details = detailsRaw as MotorcycleDetail[];
  const allCategories = Array.from(new Set(specs.map((s) => s.category))).sort();
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
    { label: "Werkstattdaten", shortLabel: "Werkstatt", to: `${basePath}/torque-specs`, isActive: true },
    { label: "Teile", to: `${basePath}/parts`, isActive: false },
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSource, setImportSource] = useState<TorqueImportSource>("own");
  const [importDialogKey, setImportDialogKey] = useState(0);
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);
  const [isRemoveShareOpen, setIsRemoveShareOpen] = useState(false);

  // Model catalog (API migration 064): null when the server predates it.
  const seriesId = motorcycle.seriesId ?? null;
  const catalogSpecs = catalog?.torqueSpecs ?? [];
  const hasCatalogSpecs = catalogSpecs.length > 0;
  const catalogLabel = seriesName ?? catalogSpecs[0]?.seriesName ?? "";
  const myContribution =
    catalog && seriesId != null ? ownContribution(catalog.contributions, seriesId) : null;
  const canShare = catalog != null && seriesId != null && specs.length > 0;
  const canImport = otherMotorcycles.length > 0 || hasCatalogSpecs;

  const openImport = (source: TorqueImportSource) => {
    setImportSource(source);
    setImportDialogKey((key) => key + 1);
    setIsImportModalOpen(true);
  };

  const submitCatalogIntent = (intent: "shareTorqueSpecsToCatalog" | "removeCatalogContribution") => {
    const formData = new FormData();
    formData.append("intent", intent);
    formData.append("motorcycleId", motorcycle.id.toString());
    if (seriesId != null) formData.append("seriesId", seriesId.toString());
    submit(formData, { method: "post" });
  };
  const [editingSpec, setEditingSpec] = useState<TorqueSpecification | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<TorqueSpecification | null>(null);
  const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);
  const [isAddDetailOpen, setIsAddDetailOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<MotorcycleDetail | null>(null);
  const [deletingDetail, setDeletingDetail] = useState<MotorcycleDetail | null>(null);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddModalOpen(false);
      setIsImportModalOpen(false);
      setEditingSpec(null);
      setDeletingSpec(null);
      setIsPressureModalOpen(false);
      setIsAddDetailOpen(false);
      setEditingDetail(null);
      setDeletingDetail(null);
      setIsShareConfirmOpen(false);
      setIsRemoveShareOpen(false);
      if ("message" in actionData && typeof actionData.message === "string") {
        toast.success(actionData.message);
      }
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

  const handleDeleteDetail = () => {
    if (!deletingDetail) return;
    const formData = new FormData();
    formData.append("intent", "deleteDetail");
    formData.append("motorcycleId", motorcycle.id.toString());
    formData.append("detailId", deletingDetail.id.toString());
    submit(formData, { method: "post" });
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 md:space-y-6 print:p-0 print:m-0 print:max-w-none print:!bg-white print:!text-black print:pb-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1.2cm; background: #ffffff; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }
          /* Force the page canvas to solid white — covers both light and
             dark themes, and beats Tailwind's dark:bg-navy-950 on body. */
          html, body,
          html.dark, html.dark body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            background-image: none !important;
            color: #000000 !important;
          }
          /* Strip dark-mode surfaces on interior elements only — body and
             html stay white from the rule above. Transparent here lets
             the white page canvas show through colored cards. */
          html.dark *:not(body) {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            color: #000000 !important;
            border-color: transparent !important;
          }
          .print-no-blur {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          /* Section dividers — a single hairline rule instead of full
             boxed borders. Keeps the page readable without paper-eating
             frames. */
          .print-section {
            border-bottom: 0.5pt solid #000 !important;
            padding-bottom: 4pt !important;
            margin-bottom: 6pt !important;
            page-break-inside: avoid;
          }
          .print-section:last-child {
            border-bottom: 0 !important;
          }
          .print-row {
            padding-top: 2pt !important;
            padding-bottom: 2pt !important;
            border: 0 !important;
          }
          .print-category-head {
            background: transparent !important;
            border: 0 !important;
            border-bottom: 0.4pt solid #555 !important;
            padding: 2pt 0 !important;
            margin-top: 4pt !important;
            font-size: 10pt !important;
            font-weight: 700 !important;
            letter-spacing: 0.02em !important;
            text-transform: uppercase !important;
          }
        }
      ` }} />

      {/* Print Only Header — compact: title row + 2-column metadata grid
          with hairline separators, no boxed border. */}
      <div className="hidden print:block print:!bg-white print:pb-2 print:mb-3 print-section">
        <div className="flex justify-between items-baseline gap-6">
          <div className="min-w-0">
            <h1 className="text-xl font-bold !text-black leading-tight">
              {motorcycle.make} {motorcycle.model}
            </h1>
            <p className="text-[11px] font-medium !text-gray-700 mt-0.5">Werkstattdaten</p>
          </div>
          <div className="text-right text-[11px] !text-gray-600 leading-snug whitespace-nowrap">
            <div suppressHydrationWarning>Gedruckt: {printDate}</div>
            <div>MotoManager v{process.env.APP_VERSION}</div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
          {[
            { label: "Fabrikationsdatum", value: motorcycle.fabricationDate || "Unbekannt" },
            { label: "Kennzeichen", value: motorcycle.numberPlate || "-" },
            { label: "VIN", value: motorcycle.vin || "-", mono: true },
            { label: "Motor-Nr.", value: motorcycle.engineNumber || "-", mono: true },
            { label: "Stammnummer", value: motorcycle.vehicleNr || "-", mono: true },
            { label: "1. Inverkehrssetzung", value: motorcycle.firstRegistration || "-" },
            { label: "Kaufdatum", value: motorcycle.purchaseDate || "-" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between gap-3 py-0.5">
              <span className="font-bold uppercase !text-gray-600 text-[11px] tracking-wide">{item.label}</span>
              <span className={clsx("font-semibold !text-black text-[11px]", item.mono && "font-mono")}>{item.value}</span>
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
          overviewLink={overviewLink}
          stats={hero.stats}
          facts={hero.facts}
          compact
        />
      </div>

      <div className="space-y-5 print:space-y-2 print:bg-white">
        {actionData && "error" in actionData && (
          <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10 print:hidden">
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] pt-0.5 opacity-70">ERR</span>
            <span>{actionData.error}</span>
          </div>
        )}

        {/* Details (1/3) beside Reifendruck (2/3); Anzugsmomente full width below. */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] print:block">
          {/* Details */}
          <section
            aria-labelledby="details-heading"
            className={clsx("min-w-0 print-section", details.length === 0 && "print:hidden")}
          >
            <Card className="print:rounded-none print:border-0 print:shadow-none print:!bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-base-200 px-4 py-3.5 dark:border-navy-700 print:border-0 print:px-0 print:py-1">
                <h2 id="details-heading" className={SECTION_TITLE}>Details</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddDetailOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                  className="print:hidden"
                >
                  Hinzufügen
                </Button>
              </div>
              {details.length === 0 ? (
                <p className="px-4 py-4 text-sm text-base-content/70 dark:text-navy-300">
                  Noch keine Details — z. B. Reifengrösse, Zündkerze, Batterie.
                </p>
              ) : (
                <dl className="divide-y divide-base-200 dark:divide-navy-700 print:grid print:grid-cols-2 print:gap-1 print:divide-y-0">
                  {details.map((detail) => (
                    <div
                      key={detail.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 print:block print:break-inside-avoid print:px-0 print:py-0 print:!bg-white print:!text-black print-row"
                    >
                      <div className="min-w-0 flex-1">
                        <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300 print:text-[8pt] print:!text-black">
                          {detail.title}
                        </dt>
                        <dd className="mt-0.5 break-words text-sm font-semibold leading-snug text-base-content dark:text-white print:text-[10pt] print:!text-black">
                          <LinkifiedText text={detail.value} />
                        </dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingDetail(detail)}
                        className={EDIT_ICON_BUTTON}
                        aria-label={`${detail.title} bearbeiten`}
                      >
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </section>

          {/* Reifendruck */}
          <section aria-labelledby="pressure-heading" className="min-w-0 print-section">
            <Card className="print:rounded-none print:border-0 print:shadow-none print:!bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-base-200 px-4 py-3.5 dark:border-navy-700 print:border-0 print:px-0 print:py-1">
                <h2 id="pressure-heading" className={SECTION_TITLE}>Reifendruck</h2>
                {pressure && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPressureModalOpen(true)}
                    className="print:hidden"
                  >
                    Bearbeiten
                  </Button>
                )}
              </div>
              {pressure ? (
                <>
                  <div className="print:hidden">
                    <TirePressureCard pressure={pressure} />
                  </div>
                  {/* Print-only inline list — borderless, tight rows. */}
                  <div className="hidden print:block">
                    {[
                      { key: "Solo", front: pressure.frontBar, rear: pressure.rearBar, sidecar: pressure.sidecarBar },
                      { key: "Sozius", front: pressure.frontPassengerBar, rear: pressure.rearPassengerBar, sidecar: pressure.sidecarPassengerBar },
                      { key: "Offroad", front: pressure.frontOffroadBar, rear: pressure.rearOffroadBar, sidecar: pressure.sidecarOffroadBar },
                    ]
                      .filter((g) => g.front != null || g.rear != null)
                      .map((g) => (
                        <div key={g.key}>
                          {g.front != null && (
                            <PressurePrintRow label={`Vorne (${g.key})`} bar={g.front} preferred={pressure.preferredUnit} />
                          )}
                          {g.rear != null && (
                            <PressurePrintRow label={`Hinten (${g.key})`} bar={g.rear} preferred={pressure.preferredUnit} />
                          )}
                          {g.sidecar != null && (
                            <PressurePrintRow label={`Beiwagen (${g.key})`} bar={g.sidecar} preferred={pressure.preferredUnit} />
                          )}
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-start gap-3 px-4 py-4 print:hidden">
                  <p className="text-sm text-base-content/70 dark:text-navy-300">
                    Noch nicht erfasst — hinterlege die empfohlenen Drücke für vorne, hinten und ggf. Beiwagen.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsPressureModalOpen(true)}
                    leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                  >
                    Reifendruck erfassen
                  </Button>
                </div>
              )}
            </Card>
          </section>
        </div>

        {/* Anzugsmomente */}
        <section aria-labelledby="torque-heading" className="print:space-y-1">
          <Card className="print:rounded-none print:border-0 print:shadow-none print:!bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 px-4 py-3.5 dark:border-navy-700 print:border-0 print:px-0 print:py-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id="torque-heading" className={SECTION_TITLE}>Anzugsmomente</h2>
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-base-content/70 print:hidden">
                  {specs.length} {specs.length === 1 ? "Eintrag" : "Einträge"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                  {canShare &&
                    (myContribution ? (
                      <span className="inline-flex h-8 items-center gap-2 rounded-sm border border-base-content/15 pl-2.5 pr-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:border-navy-700 dark:text-navy-300">
                        <Share2 className="h-3 w-3" aria-hidden="true" />
                        <span>Im Katalog geteilt · {formatShareDate(myContribution.sharedAt)}</span>
                        <button
                          type="button"
                          onClick={() => setIsShareConfirmOpen(true)}
                          className="rounded-sm px-1.5 py-1 text-primary hover:bg-primary/10"
                          title="Aktuelle Werte erneut teilen (ersetzt deinen Beitrag)"
                        >
                          Aktualisieren
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRemoveShareOpen(true)}
                          className="rounded-sm px-1.5 py-1 text-error hover:bg-error/10"
                        >
                          Entfernen
                        </button>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsShareConfirmOpen(true)}
                        leftIcon={<Share2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Im Modellkatalog teilen
                      </Button>
                    ))}
                  {specs.length > 0 && canImport && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openImport(hasCatalogSpecs ? "catalog" : "own")}
                      leftIcon={<Import className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Importieren
                    </Button>
                  )}
                  {specs.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddModalOpen(true)}
                      leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Hinzufügen
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-base-content/15 text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
                    title="Drucken"
                    aria-label="Werkstattdaten drucken"
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                  </button>
              </div>
            </div>

            {specs.length === 0 ? (
              <div className="relative print:hidden">
                {/* Ghost table hints at what will appear here. */}
                <table aria-hidden="true" className="w-full opacity-35">
                  <thead>
                    <tr>
                      <th className={clsx(TH, "text-left")}>Bauteil</th>
                      <th className={clsx(TH, "text-right")}>Werkzeug</th>
                      <th className={clsx(TH, "text-right")}>Nm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["w-[55%] sm:w-56", "w-[40%] sm:w-40", "w-[65%] sm:w-64", "w-[48%] sm:w-48"].map((w) => (
                      <tr key={w} className="border-b border-base-200 dark:border-navy-700">
                        <td className="px-4 py-3.5"><div className={clsx("h-2.5 bg-base-300 dark:bg-navy-600", w)} /></td>
                        <td className="px-4 py-3.5"><div className="ml-auto h-2.5 w-12 bg-base-300 dark:bg-navy-600" /></td>
                        <td className="px-4 py-3.5"><div className="ml-auto h-2.5 w-8 bg-base-300 dark:bg-navy-600" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="flex max-w-[440px] flex-col gap-3 rounded-sm border border-base-300 bg-base-100 px-5 py-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] dark:border-navy-700 dark:bg-navy-800">
                    <span className="font-display text-[22px] uppercase tracking-[0.3px] text-base-content dark:text-white">
                      Noch keine Anzugsmomente
                    </span>
                    <span className="text-sm text-base-content/70 dark:text-navy-300">
                      {hasCatalogSpecs
                        ? "Werte aus dem Modellkatalog übernehmen oder selbst erfassen — mit Werkzeug und Drehmoment pro Bauteil."
                        : otherMotorcycles.length > 0
                          ? "Werte von einem anderen Motorrad übernehmen oder selbst erfassen — mit Werkzeug und Drehmoment pro Bauteil."
                          : "Erfasse Werkzeug und Drehmoment pro Bauteil."}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {hasCatalogSpecs ? (
                        <Button
                          type="button"
                          onClick={() => openImport("catalog")}
                          leftIcon={<Import className="h-4 w-4" aria-hidden="true" />}
                        >
                          Importieren · Modellkatalog {catalogLabel}
                        </Button>
                      ) : (
                        otherMotorcycles.length > 0 && (
                          <Button
                            type="button"
                            onClick={() => openImport("own")}
                            leftIcon={<Import className="h-4 w-4" aria-hidden="true" />}
                          >
                            Importieren
                          </Button>
                        )
                      )}
                      <Button
                        type="button"
                        variant={canImport ? "secondary" : "primary"}
                        onClick={() => setIsAddModalOpen(true)}
                        leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                      >
                        Erster Eintrag
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full min-w-[480px] print:min-w-0">
                  <thead className="print:hidden">
                    <tr>
                      <th scope="col" className={clsx(TH, "text-left")}>Bauteil</th>
                      <th scope="col" className={clsx(TH, "text-right")}>Werkzeug</th>
                      <th scope="col" className={clsx(TH, "text-right")}>Nm</th>
                      <th scope="col" className={clsx(TH, "w-12")}><span className="sr-only">Aktionen</span></th>
                    </tr>
                  </thead>
                  {Array.from(new Set(specs.map((s) => s.category))).map((category) => (
                    <tbody key={category as string} className="print:break-inside-avoid">
                      <tr>
                        <th
                          scope="colgroup"
                          colSpan={4}
                          className="border-b border-base-200 bg-base-200/50 px-4 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:border-navy-700 dark:bg-navy-900/40 dark:text-navy-300 print-category-head"
                        >
                          {category as string}
                        </th>
                      </tr>
                      {specs.filter((s) => s.category === category).map((spec: TorqueSpecification) => (
                        <tr key={spec.id} className="border-b border-base-200 hover:bg-base-200/40 dark:border-navy-700 dark:hover:bg-navy-700/30 print-row">
                          <td className="px-4 py-3 align-top print:px-0 print:py-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-base-content dark:text-white print:text-[10pt] print:!text-black">
                                {spec.name}
                              </span>
                              {spec.unverified && (
                                <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-workshop)]/40 bg-[var(--color-workshop)]/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)] print:border-black print:!bg-white print:!text-black">
                                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                  Unverifiziert
                                </span>
                              )}
                            </div>
                            {spec.description && (
                              <p className="mt-0.5 max-w-xl text-xs leading-snug text-base-content/70 dark:text-navy-300 print:text-[8.5pt] print:!text-gray-700">
                                <FormattedText description={spec.description} markup={spec.descriptionMarkup} />
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right align-top font-numeric text-sm font-semibold text-base-content dark:text-white print:px-2 print:py-0 print:text-[10pt] print:!text-black">
                            {spec.toolSize ?? <span className="text-base-content/40">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right align-top print:px-0 print:py-0">
                            <span
                              className={clsx(
                                "font-numeric text-[17px] font-bold print:text-[10pt] print:!text-black",
                                spec.unverified
                                  ? "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]"
                                  : "text-base-content dark:text-white",
                              )}
                            >
                              {spec.torque}{spec.torqueEnd ? `–${spec.torqueEnd}` : ""}
                            </span>
                            {spec.variation && (
                              <span className="ml-1 font-numeric text-xs font-semibold text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)] print:!text-black">
                                ± {spec.variation}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right align-top print:hidden">
                            <button
                              type="button"
                              onClick={() => setEditingSpec(spec)}
                              className={EDIT_ICON_BUTTON}
                              aria-label={`${spec.name} bearbeiten`}
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>

      <Modal
        isOpen={isAddDetailOpen}
        onClose={() => setIsAddDetailOpen(false)}
        title="Detail hinzufügen"
        description="Füge einen neuen Eintrag hinzu."
      >
        <MotorcycleDetailForm
          motorcycleId={motorcycle.id}
          onClose={() => setIsAddDetailOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(editingDetail)}
        onClose={() => setEditingDetail(null)}
        title="Detail bearbeiten"
        description="Passe den Eintrag an."
      >
        {editingDetail && (
          <MotorcycleDetailForm
            motorcycleId={motorcycle.id}
            initialValues={editingDetail}
            onClose={() => setEditingDetail(null)}
            onDelete={(detail) => setDeletingDetail(detail)}
          />
        )}
      </Modal>

      <DeleteConfirmationDialog
        isOpen={Boolean(deletingDetail)}
        title="Detail löschen"
        description={`Möchtest du das Detail "${deletingDetail?.title}" wirklich löschen?`}
        onConfirm={handleDeleteDetail}
        onCancel={() => setDeletingDetail(null)}
      />

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
        key={importDialogKey}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetMotorcycleId={motorcycle.id}
        otherMotorcycles={otherMotorcycles}
        otherSpecs={otherSpecs}
        existingSpecs={specs}
        catalogSpecs={catalogSpecs}
        initialSource={importSource}
      />

      <Modal
        isOpen={isShareConfirmOpen}
        onClose={() => setIsShareConfirmOpen(false)}
        title="Im Modellkatalog teilen"
        description={`${specs.length} ${specs.length === 1 ? "Anzugsmoment wird" : "Anzugsmomente werden"} unter «${catalogLabel}» in den Modellkatalog kopiert.`}
      >
        <div className="space-y-4">
          <p className="text-sm text-base-content/80 dark:text-navy-200">
            Die Werte sind danach für <strong>alle Nutzer dieses Servers</strong> sichtbar und
            importierbar — zusammen mit deinem Benutzernamen.
            {myContribution
              ? " Dein bisheriger Beitrag für dieses Modell wird ersetzt."
              : " Teilst du später erneut, wird dein Beitrag ersetzt."}
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsShareConfirmOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => submitCatalogIntent("shareTorqueSpecsToCatalog")}
              leftIcon={<Share2 className="h-4 w-4" aria-hidden="true" />}
            >
              Teilen
            </Button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmationDialog
        isOpen={isRemoveShareOpen}
        title="Aus dem Modellkatalog entfernen"
        description={`Deine ${myContribution?.count ?? ""} geteilten Werte für «${catalogLabel}» werden aus dem Katalog entfernt. Die Werte an deinem Motorrad bleiben erhalten.`}
        confirmLabel="Entfernen"
        onConfirm={() => submitCatalogIntent("removeCatalogContribution")}
        onCancel={() => setIsRemoveShareOpen(false)}
      />

      <Modal
        isOpen={isPressureModalOpen}
        onClose={() => setIsPressureModalOpen(false)}
        title={pressure ? "Reifendruck bearbeiten" : "Reifendruck erfassen"}
        description={`Empfohlene Werte für ${motorcycle.make} ${motorcycle.model}.`}
      >
        <TirePressureForm
          motorcycleId={motorcycle.id}
          hasSidecar={Boolean(motorcycle.hasSidecar)}
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
    <div className="hidden print:flex print:justify-between print:py-0.5 print:!text-black print:text-[10pt]">
      <span className="print:font-semibold print:!text-black">{label}</span>
      <span className="print:!text-black print:font-numeric">
        {f.primary} <span className="print:!text-gray-600">({f.secondary})</span>
      </span>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
