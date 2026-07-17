import { Form, useSubmit, useActionData, useNavigation } from "react-router";
import type { EditorMotorcycle, CurrencySetting, MaintenanceRecord, MotorcycleStatus } from "~/types/db";
import { modelSeriesDisplayName, type ModelSeries } from "~/types/parts";
import { seriesPath, seriesTree } from "~/utils/series";
import { decodeVin } from "~/services/parts";
import { getSessionToken } from "~/services/auth";
import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import getCroppedImg from "~/utils/cropImage";
import { toast } from "~/hooks/use-toast";
import { Modal } from "./modal";
import { ImportRoadTripDialog } from "./import-roadtrip-dialog";
import type { RoadTripFuelEntry } from "~/utils/roadtrip-import";
import { Fuel, Users } from "lucide-react";
import { Button } from "./button";
import { FormField } from "./form-field";
import { getBackendAssetUrl } from "~/utils/backend";
import { motorcycleSchema } from "~/validations";
import clsx from "clsx";

interface AddMotorcycleFormProps {
  onSubmit?: () => void;
  initialValues?: (EditorMotorcycle & { id?: number });
  intent?: string;
  submitLabel?: string;
  currencies?: CurrencySetting[];
  /** Series lookup for the Baureihe select (drives part compatibility). */
  modelSeries?: ModelSeries[];
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  existingMaintenance?: MaintenanceRecord[];
  /** Opens the previous-owners management dialog. Only meaningful when editing. */
  onManagePreviousOwners?: () => void;
  /** Recorded previous-owner count, shown on the manage button. */
  previousOwnersCount?: number;
}

const formatDateInput = (value?: string | null) => {
  if (!value) {
    return "";
  }
  return value.split("T")[0] ?? "";
};

const EMPTY_CURRENCIES: CurrencySetting[] = [];
const EMPTY_MAINTENANCE: MaintenanceRecord[] = [];
const EMPTY_SERIES: ModelSeries[] = [];

export function AddMotorcycleForm({
  onSubmit,
  initialValues,
  intent = "createMotorcycle",
  submitLabel = "Speichern",
  currencies = EMPTY_CURRENCIES,
  modelSeries = EMPTY_SERIES,
  onDelete,
  existingMaintenance = EMPTY_MAINTENANCE,
  onManagePreviousOwners,
  previousOwnersCount = 0,
}: AddMotorcycleFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  // Tracked so the sidecar brake select only shows for a sidecar rig.
  const [hasSidecar, setHasSidecar] = useState<boolean>(Boolean(initialValues?.hasSidecar));
  // Status drives the conditional "Verkauf" (sale) block.
  const [status, setStatus] = useState<MotorcycleStatus>(initialValues?.status ?? "active");

  const isSubmitting = navigation.state === "submitting" &&
                      (navigation.formData?.get("intent") === intent ||
                       navigation.formData?.get("intent") === "importFuelData");

  const handleRoadTripImport = (selectedEntries: RoadTripFuelEntry[]) => {
    if (initialValues?.id) {
      const formData = new FormData();
      formData.append("intent", "importFuelData");
      formData.append("motorcycleId", initialValues.id.toString());
      formData.append("records", JSON.stringify(selectedEntries));
      submit(formData, { method: "post" });
    }
  };

  const actionData = useActionData<{
    errors?: Record<string, string>;
    error?: string;
  }>();

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  /** Validates a single field against the zod schema, used on blur. */
  const validateField = (field: keyof typeof motorcycleSchema.shape, value: string) => {
    const result = motorcycleSchema.shape[field].safeParse(value);
    setClientErrors((prev) => {
      const next = { ...prev };
      if (result.success) {
        delete next[field];
      } else {
        next[field] = result.error.issues[0]?.message ?? "Ungültiger Wert";
      }
      return next;
    });
  };

  /** Hides a stale client error as soon as the user edits the field again. */
  const clearClientError = (field: string) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /** Live client error wins over the (older) server-side error. */
  const fieldError = (field: keyof typeof motorcycleSchema.shape) =>
    clientErrors[field] ?? actionData?.errors?.[field];

  // Baureihe select is controlled so a decoded VIN can preselect it.
  const [seriesIdValue, setSeriesIdValue] = useState<string>(
    initialValues?.seriesId != null ? String(initialValues.seriesId) : "",
  );
  const [vinHint, setVinHint] = useState<string | null>(null);

  /** Decode a complete VIN (17 chars) or a classic frame number: 6-8 digits,
   *  leading zeros allowed, optionally with the stamped model designation
   *  appended (ECE plates read e.g. "0103596 K75S"). */
  const handleVinBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
    const vin = event.currentTarget.value.replace(/\s/g, "");
    const isFrameNumber = /^\d{6,8}[A-Z0-9]{0,6}$/i.test(vin);
    if (vin.length !== 17 && !isFrameNumber) return;
    const token = getSessionToken();
    if (!token) return;
    try {
      const result = await decodeVin(token, vin);
      const sourceLabel = result.kind === "frameNumber" ? "Rahmennummer" : "VIN";
      if (result.match) {
        setSeriesIdValue(String(result.match.id));
        setVinHint(
          `Aus ${sourceLabel} erkannt: ${seriesPath(result.match, modelSeries)}` +
            (result.modelYear ? ` · Modelljahr ${result.modelYear}` : ""),
        );
      } else if (result.kind === "frameNumber") {
        setVinHint(
          `Rahmennummer ${result.vin} liegt in keinem hinterlegten Bereich des Modellkatalogs.`,
        );
      } else if (result.isBmw) {
        setVinHint(
          `BMW-VIN erkannt, aber Typcode ${result.typeCode} ist im Modellkatalog nicht hinterlegt.`,
        );
      } else {
        setVinHint(null);
      }
    } catch {
      // Decoding is best-effort; a failed lookup must never block the form.
    }
  };

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [isCropSaving, setIsCropSaving] = useState(false);

  const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Ungültige Datei", "Bitte wähle eine Bilddatei aus.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Datei zu groß", "Das Bild darf höchstens 15 MB groß sein.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setSelectedImage(reader.result as string);
      setIsCropping(true);
    });
    reader.addEventListener("error", () => {
      toast.error("Fehler", "Das Bild konnte nicht gelesen werden.");
    });
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    setIsCropSaving(true);
    try {
      const blob = await getCroppedImg(selectedImage, croppedAreaPixels);
      if (blob) {
        setCroppedImageBlob(blob);
        setCroppedImageUrl(URL.createObjectURL(blob));
        setIsCropping(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Zuschneiden fehlgeschlagen", "Das Bild konnte nicht zugeschnitten werden.");
    } finally {
      setIsCropSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Unchecked checkboxes are simply absent from FormData, which the backend
    // reads as "keep the current value" — send explicit booleans so
    // un-archiving and clearing the veteran flag actually save.
    formData.set("isVeteran", formData.has("isVeteran") ? "true" : "false");
    formData.set("hasSidecar", formData.has("hasSidecar") ? "true" : "false");
    // status is a <select> (always submits); no boolean coercion needed.

    if (croppedImageBlob) {
      formData.append("image", croppedImageBlob, "motorcycle.jpg");
    }

    submit(formData, {
      method: "post",
      encType: "multipart/form-data",
    });
  };

  return (
    <>
      <Form method="post" encType="multipart/form-data" className="grid gap-5" onSubmit={handleSubmit}>
        <input type="hidden" name="intent" value={intent} />
        {typeof initialValues?.id === "number" && (
          <input type="hidden" name="motorcycleId" value={initialValues.id} />
        )}
        
        {/* min-w-0 on grid children: a wide control (long Baureihe option)
            must truncate instead of blowing up the column and forcing the
            whole modal to scroll horizontally. */}
        <div className="grid gap-5 sm:grid-cols-2 [&>*]:min-w-0">
          {actionData?.error && (
            <div className="col-span-full rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-300">
              {actionData.error}
            </div>
          )}
          {/* Image Upload Field */}
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="image-upload" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Bild</label>
            <div className="flex items-start gap-4">
              {initialValues?.image && !croppedImageUrl && (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-navy-700">
                  <img
                    src={`${getBackendAssetUrl(initialValues.image)}?width=200`}
                    alt="Current"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {!croppedImageUrl ? (
                <div className="flex-1">
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={onSelectFile}
                    className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary file:text-white
                            hover:file:bg-primary-dark
                          "/>
                  {initialValues?.image && (
                    <p className="mt-1 text-xs text-secondary dark:text-navy-400">
                      Lade ein neues Bild hoch, um das aktuelle zu ersetzen.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <img src={croppedImageUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCroppedImageUrl(null);
                      setCroppedImageBlob(null);
                      setSelectedImage(null);
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Entfernen
                  </button>
                </div>
              )}
            </div>
          </div>

          <FormField
            label="Marke"
            name="make"
            placeholder="z.B. Yamaha"
            defaultValue={initialValues?.make}
            error={fieldError("make")}
            onBlur={(e) => validateField("make", e.currentTarget.value)}
            onChange={() => clearClientError("make")}
          />

          <FormField
            label="Modell"
            name="model"
            placeholder="z.B. MT-07"
            defaultValue={initialValues?.model}
            error={fieldError("model")}
            onBlur={(e) => validateField("model", e.currentTarget.value)}
            onChange={() => clearClientError("model")}
          />

          <FormField
            label="Fabrikationsdatum"
            name="fabricationDate"
            placeholder="z.B. 07/1997"
            defaultValue={initialValues?.fabricationDate ?? ""}
            error={fieldError("fabricationDate")}
            onBlur={(e) => validateField("fabricationDate", e.currentTarget.value)}
            onChange={() => clearClientError("fabricationDate")}
          />

          {modelSeries.length > 0 && (
            <FormField
              label="Baureihe / Modell"
              name="seriesId"
              as="select"
              value={seriesIdValue}
              onChange={(event) => {
                setSeriesIdValue((event.target as HTMLSelectElement).value);
                setVinHint(null);
              }}
              helperText={
                vinHint ??
                "Je genauer die Ebene (Familie › Serie › Modell), desto präziser die Teile-Zuordnung."
              }
            >
              <option value="">Keine Zuordnung</option>
              {seriesTree(modelSeries).map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {"   ".repeat(depth)}
                  {modelSeriesDisplayName(node)}
                </option>
              ))}
            </FormField>
          )}

          <FormField
            label="Fahrgestellnummer (VIN)"
            name="vin"
            defaultValue={initialValues?.vin ?? ""}
            error={actionData?.errors?.vin}
            onBlur={handleVinBlur}
            helperText="BMW-VINs (WB1…) und Rahmennummern von Vor-1981-Maschinen werden automatisch erkannt."
          />

          <FormField
            label="Motor-Nummer"
            name="engineNumber"
            defaultValue={initialValues?.engineNumber ?? ""}
            error={actionData?.errors?.engineNumber}
          />

          <FormField
            label="Stammnummer"
            name="vehicleNr"
            defaultValue={initialValues?.vehicleNr ?? ""}
          />

          <FormField
            label="Kennzeichen"
            name="numberPlate"
            placeholder="z.B. ZH 123456"
            defaultValue={initialValues?.numberPlate ?? ""}
          />

          <FormField
            label="1. Inverkehrssetzung"
            name="firstRegistration"
            type="date"
            defaultValue={formatDateInput(initialValues?.firstRegistration)}
          />

          <FormField
            label="Anfangs-KM"
            name="initialOdo"
            type="number"
            defaultValue={typeof initialValues?.initialOdo === "number" ? initialValues.initialOdo : 0}
            error={fieldError("initialOdo")}
            onBlur={(e) => validateField("initialOdo", e.currentTarget.value)}
            onChange={() => clearClientError("initialOdo")}
          />

          <FormField
            label="Kaufdatum"
            name="purchaseDate"
            type="date"
            defaultValue={formatDateInput(initialValues?.purchaseDate)}
          />

          {/* Joined price + currency control — FormField only renders a single
              input, so this stays bespoke but mirrors its error treatment. */}
          <div className="space-y-1.5">
            <label
              htmlFor="purchasePrice"
              className="block text-xs font-semibold uppercase tracking-wider text-base-content/60"
            >
              Kaufpreis
            </label>
            <div className="flex rounded-xl shadow-sm">
              <input
                type="number"
                name="purchasePrice"
                id="purchasePrice"
                step="0.05"
                placeholder="0.00"
                defaultValue={typeof initialValues?.purchasePrice === "number" ? initialValues.purchasePrice : ""}
                aria-invalid={fieldError("purchasePrice") ? "true" : undefined}
                aria-describedby={fieldError("purchasePrice") ? "purchasePrice-error" : undefined}
                onBlur={(e) => validateField("purchasePrice", e.currentTarget.value)}
                onChange={() => clearClientError("purchasePrice")}
                className={clsx(
                  "block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500",
                  fieldError("purchasePrice") && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
              />
              <select
                name="currencyCode"
                className="shrink-0 rounded-r-xl border-l-0 border-gray-200 bg-gray-100 py-3 pl-3 pr-9 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                defaultValue={initialValues?.currencyCode ?? "CHF"}
              >
                {currencies?.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            {fieldError("purchasePrice") && (
              <p id="purchasePrice-error" aria-live="polite" className="text-xs font-medium text-error animate-fade-in">
                {fieldError("purchasePrice")}
              </p>
            )}
          </div>

          <FormField
            label="Tankgrösse (Liter)"
            name="fuelTankSize"
            type="number"
            step="0.1"
            placeholder="z.B. 18.5"
            defaultValue={initialValues?.fuelTankSize ?? ""}
            error={fieldError("fuelTankSize")}
            onBlur={(e) => validateField("fuelTankSize", e.currentTarget.value)}
            onChange={() => clearClientError("fuelTankSize")}
          />
        </div>

        <div className="col-span-full space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isVeteran"
              id="isVeteran"
              value="true"
              defaultChecked={Boolean(initialValues?.isVeteran)}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary" />
            <label htmlFor="isVeteran" className="text-sm font-medium text-foreground dark:text-white">
              Veteranen-Status
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="hasSidecar"
              id="hasSidecar"
              value="true"
              checked={hasSidecar}
              onChange={(e) => setHasSidecar(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary" />
            <label htmlFor="hasSidecar" className="text-sm font-medium text-foreground dark:text-white">
              Beiwagen (Gespann)
            </label>
          </div>
          <div className="space-y-1 border-t border-gray-100 pt-3 dark:border-navy-700">
            <label htmlFor="status" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
              Status
            </label>
            <select
              name="status"
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MotorcycleStatus)}
              className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white sm:max-w-xs"
            >
              <option value="active">Aktiv</option>
              <option value="sold">Verkauft</option>
            </select>
          </div>

          {/* Sale details — shown when the bike is sold. */}
          {status === "sold" && (
            <div className="space-y-3 rounded-sm border border-base-300/70 bg-base-100 p-3 dark:border-navy-700 dark:bg-navy-900">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
                Verkauf
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="soldDate" className="text-xs font-medium text-secondary dark:text-navy-300">Verkaufsdatum</label>
                  <input
                    type="date"
                    name="soldDate"
                    id="soldDate"
                    defaultValue={formatDateInput(initialValues?.soldDate)}
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="salePrice" className="text-xs font-medium text-secondary dark:text-navy-300">Verkaufspreis</label>
                  <div className="flex rounded-xl shadow-sm">
                    <input
                      type="number"
                      name="salePrice"
                      id="salePrice"
                      step="0.05"
                      placeholder="0.00"
                      defaultValue={typeof initialValues?.salePrice === "number" ? initialValues.salePrice : ""}
                      className="block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white"
                    />
                    <select
                      name="saleCurrencyCode"
                      defaultValue={initialValues?.saleCurrencyCode ?? initialValues?.currencyCode ?? "CHF"}
                      className="shrink-0 rounded-r-xl border-l-0 border-gray-200 bg-gray-100 py-3 pl-3 pr-9 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                    >
                      {currencies?.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="buyerName" className="text-xs font-medium text-secondary dark:text-navy-300">Käufer</label>
                <input
                  type="text"
                  name="buyerName"
                  id="buyerName"
                  placeholder="Name des Käufers"
                  defaultValue={initialValues?.buyerName ?? ""}
                  className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Drivetrain — filters chain- vs shaft-drive maintenance options.
              "—" keeps every option available. */}
          <div className="space-y-1 border-t border-gray-100 pt-3 dark:border-navy-700">
            <label htmlFor="driveType" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
              Antrieb
            </label>
            <select
              name="driveType"
              id="driveType"
              defaultValue={initialValues?.driveType ?? ""}
              className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white sm:max-w-xs"
            >
              <option value="">—</option>
              <option value="chain">Kettenantrieb</option>
              <option value="shaft">Kardanantrieb</option>
            </select>
          </div>

          {/* Per-wheel brake type — drives the brake options in the maintenance
              dialog. Leave a wheel on "—" to keep every option available. */}
          <div className="space-y-2 pt-1">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
              Bremsen
            </span>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { name: "frontBrakeType", label: "Vorne", value: initialValues?.frontBrakeType },
                  { name: "rearBrakeType", label: "Hinten", value: initialValues?.rearBrakeType },
                  ...(hasSidecar
                    ? [{ name: "sidecarBrakeType", label: "Beiwagen", value: initialValues?.sidecarBrakeType }]
                    : []),
                ] as const
              ).map((b) => (
                <div key={b.name} className="space-y-1">
                  <label htmlFor={b.name} className="text-xs font-medium text-secondary dark:text-navy-300">
                    {b.label}
                  </label>
                  <select
                    name={b.name}
                    id={b.name}
                    defaultValue={b.value ?? ""}
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                  >
                    <option value="">—</option>
                    <option value="disc">Scheibenbremse</option>
                    <option value="drum">Trommelbremse</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {initialValues?.id && onManagePreviousOwners && (
            <div className="pt-2 border-t border-gray-100 dark:border-navy-700">
              <Button
                type="button"
                variant="outline"
                onClick={onManagePreviousOwners}
                leftIcon={<Users className="h-4 w-4" />}
              >
                Vorbesitzer verwalten{previousOwnersCount > 0 ? ` (${previousOwnersCount})` : ""}
              </Button>
              <p className="mt-1.5 text-[10px] text-secondary/70 dark:text-navy-400">
                Erfasse die Besitzerkette oder markiere die Historie als unvollständig.
              </p>
            </div>
          )}

          {initialValues?.id && (
            <div className="pt-2 border-t border-gray-100 dark:border-navy-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                leftIcon={<Fuel className="h-4 w-4" />}
              >
                RoadTrip Import
              </Button>
              <p className="mt-1.5 text-[10px] text-secondary/70 dark:text-navy-400">
                Importiere historische Tankdaten aus der RoadTrip App (.csv Export).
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 border-red-200 dark:border-red-900/40 dark:text-red-300"
            >
              Motorrad löschen
            </Button>
          ) : (
            <div></div>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onSubmit}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="px-6"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </Form>

      <Modal isOpen={isCropping} onClose={() => setIsCropping(false)} title="Bild zuschneiden">
        <div className="relative h-80 w-full bg-gray-900 rounded-lg overflow-hidden">
          {selectedImage && (
            <Cropper
              image={selectedImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-label="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsCropping(false)}
            disabled={isCropSaving}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={showCroppedImage}
            isLoading={isCropSaving}
          >
            Fertig
          </Button>
        </div>
      </Modal>

      <ImportRoadTripDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleRoadTripImport}
        existingMaintenance={existingMaintenance}
      />
    </>
  );
}
