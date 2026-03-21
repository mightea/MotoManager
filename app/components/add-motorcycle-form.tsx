import { Form, useSubmit, useActionData, useNavigation } from "react-router";
import type { EditorMotorcycle, CurrencySetting, MaintenanceRecord } from "~/types/db";
import { useState } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "~/utils/cropImage";
import { Modal } from "./modal";
import { ImportRoadTripDialog } from "./import-roadtrip-dialog";
import { useIsOffline } from "~/utils/offline";
import { Fuel } from "lucide-react";
import { Button } from "./button";
import { FormField } from "./form-field";
import clsx from "clsx";

interface AddMotorcycleFormProps {
  onSubmit?: () => void;
  initialValues?: (EditorMotorcycle & { id?: number });
  intent?: string;
  submitLabel?: string;
  currencies?: CurrencySetting[];
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  existingMaintenance?: MaintenanceRecord[];
}

const formatDateInput = (value?: string | null) => {
  if (!value) {
    return "";
  }
  return value.split("T")[0] ?? "";
};

export function AddMotorcycleForm({
  onSubmit,
  initialValues,
  intent = "createMotorcycle",
  submitLabel = "Speichern",
  currencies = [],
  onDelete,
  existingMaintenance = [],
}: AddMotorcycleFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const isSubmitting = navigation.state === "submitting" && 
                      (navigation.formData?.get("intent") === intent || 
                       navigation.formData?.get("intent") === "importFuelData");
  const isOffline = useIsOffline();

  const handleRoadTripImport = (selectedEntries: any[]) => {
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
  }>();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImage(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(selectedImage, croppedAreaPixels);
      if (blob) {
        setCroppedImageBlob(blob);
        setCroppedImageUrl(URL.createObjectURL(blob));
        setIsCropping(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

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
        
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Image Upload Field */}
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="image-upload" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Bild</label>
            <div className="flex items-start gap-4">
              {initialValues?.image && !croppedImageUrl && (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-navy-700">
                  <img
                    src={`${initialValues.image}?width=200`}
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
            error={actionData?.errors?.make}
          />

          <FormField
            label="Modell"
            name="model"
            placeholder="z.B. MT-07"
            defaultValue={initialValues?.model}
            error={actionData?.errors?.model}
          />

          <FormField
            label="Fabrikationsdatum"
            name="fabricationDate"
            placeholder="z.B. 07/1997"
            defaultValue={initialValues?.fabricationDate ?? ""}
            error={actionData?.errors?.fabricationDate}
          />

          <FormField
            label="Fahrgestellnummer (VIN)"
            name="vin"
            defaultValue={initialValues?.vin ?? ""}
            error={actionData?.errors?.vin}
          />

          <FormField
            label="Motor-Nummer"
            name="engineNumber"
            defaultValue={initialValues?.engineNumber ?? ""}
            error={actionData?.errors?.engineNumber}
          />

          <FormField
            label="Stammnummer"
            name="vehicleIdNr"
            defaultValue={initialValues?.vehicleIdNr ?? ""}
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
            error={actionData?.errors?.initialOdo}
          />

          <FormField
            label="Kaufdatum"
            name="purchaseDate"
            type="date"
            defaultValue={formatDateInput(initialValues?.purchaseDate)}
          />

          <div className="space-y-1.5">
            <label htmlFor="purchasePrice" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kaufpreis</label>
            <div className="flex rounded-xl shadow-sm">
              <input
                type="number"
                name="purchasePrice"
                id="purchasePrice"
                step="0.05"
                placeholder="0.00"
                defaultValue={typeof initialValues?.purchasePrice === "number" ? initialValues.purchasePrice : ""}
                className={clsx(
                  "block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500",
                  actionData?.errors?.purchasePrice && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
              />
              <select
                name="currencyCode"
                className="rounded-r-xl border-l-0 border-gray-200 bg-gray-100 p-3 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                defaultValue={initialValues?.currencyCode ?? "CHF"}
              >
                {currencies?.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            {actionData?.errors?.purchasePrice && (
              <p className="text-xs font-medium text-red-500">{actionData.errors.purchasePrice}</p>
            )}
          </div>

          <FormField
            label="Tankgrösse (Liter)"
            name="fuelTankSize"
            type="number"
            step="0.1"
            placeholder="z.B. 18.5"
            defaultValue={initialValues?.fuelTankSize ?? ""}
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
              name="isArchived"
              id="isArchived"
              value="true"
              defaultChecked={Boolean(initialValues?.isArchived)}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary" />
            <label htmlFor="isArchived" className="text-sm font-medium text-foreground dark:text-white">
              Archiviert
            </label>
          </div>

          {initialValues?.id && (
            <div className="pt-2 border-t border-gray-100 dark:border-navy-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                disabled={isOffline}
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
              disabled={isOffline}
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
              disabled={isOffline}
              className="px-6"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
        {isOffline && (
          <p className="mt-2 text-center text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-950/20 py-2 rounded-lg border border-orange-200 dark:border-orange-900/50">
            Motorräder können offline nicht hinzugefügt oder bearbeitet werden.
          </p>
        )}
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
              aria-labelledby="Zoom"
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
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={showCroppedImage}
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
