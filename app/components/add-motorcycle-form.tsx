import { Form, useSubmit } from "react-router";
import type { EditorMotorcycle } from "~/db/schema";
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "~/utils/cropImage";
import { Modal } from "./modal";

interface AddMotorcycleFormProps {
  onSubmit?: () => void;
  initialValues?: (EditorMotorcycle & { id?: number });
  intent?: string;
  submitLabel?: string;
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
}: AddMotorcycleFormProps) {
  const submit = useSubmit();
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

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
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
  }, [selectedImage, croppedAreaPixels]);

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

    if (onSubmit) {
        onSubmit();
    }
  };

  return (
    <>
    <Form method="post" encType="multipart/form-data" className="grid gap-5" onSubmit={handleSubmit}>
        <input type="hidden" name="intent" value={intent} />
        {typeof initialValues?.id === "number" && (
            <input type="hidden" name="motorcycleId" value={initialValues.id} />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Bild</label>
                {!croppedImageUrl ? (
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onSelectFile}
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-white
                        hover:file:bg-primary-dark
                      "/>
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

            <div className="space-y-1.5">
                <label htmlFor="make" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Marke</label>
                <input
                    type="text"
                    name="make"
                    id="make"
                    required
                    placeholder="z.B. Yamaha"
                    defaultValue={initialValues?.make}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="model" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Modell</label>
                <input
                    type="text"
                    name="model"
                    id="model"
                    required
                    placeholder="z.B. MT-07"
                    defaultValue={initialValues?.model}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="modelYear" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Jahrgang</label>
                <input
                    type="number"
                    name="modelYear"
                    id="modelYear"
                    placeholder="z.B. 2021"
                    defaultValue={initialValues?.modelYear ?? ""}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="vin" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Fahrgestellnummer (VIN)</label>
                <input
                    type="text"
                    name="vin"
                    id="vin"
                    required
                    defaultValue={initialValues?.vin}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="vehicleIdNr" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Stammnummer</label>
                <input
                    type="text"
                    name="vehicleIdNr"
                    id="vehicleIdNr"
                    defaultValue={initialValues?.vehicleIdNr ?? ""}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="firstRegistration" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">1. Inverkehrssetzung</label>
                <input
                    type="date"
                    name="firstRegistration"
                    id="firstRegistration"
                    defaultValue={formatDateInput(initialValues?.firstRegistration)}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="initialOdo" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Anfangs-KM</label>
                <input
                    type="number"
                    name="initialOdo"
                    id="initialOdo"
                    defaultValue={
                        typeof initialValues?.initialOdo === "number"
                            ? initialValues.initialOdo
                            : 0
                    }
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="purchaseDate" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kaufdatum</label>
                <input
                    type="date"
                    name="purchaseDate"
                    id="purchaseDate"
                    defaultValue={formatDateInput(initialValues?.purchaseDate)}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="purchasePrice" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kaufpreis</label>
                <div className="flex rounded-xl shadow-sm">
                    <input
                        type="number"
                        name="purchasePrice"
                        id="purchasePrice"
                        step="0.05"
                        placeholder="0.00"
                        defaultValue={
                            typeof initialValues?.purchasePrice === "number"
                                ? initialValues.purchasePrice
                                : ""
                        }
                        className="block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
                     <select
                        name="currencyCode"
                        className="rounded-r-xl border-l-0 border-gray-200 bg-gray-100 p-3 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                        defaultValue={initialValues?.currencyCode ?? "CHF"}
                    >
                        <option value="CHF">CHF</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="col-span-full space-y-3 pt-2">
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    name="isVeteran"
                    id="isVeteran"
                    value="true"
                    defaultChecked={Boolean(initialValues?.isVeteran)}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary"/>
                <label htmlFor="isVeteran" className="text-sm font-medium text-foreground dark:text-white">
                    Veteranen-Status
                </label>
            </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4">
            <button
                type="button"
                onClick={onSubmit}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
            >
                Abbrechen
            </button>
            <button 
                type="submit" 
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98]"
            >
                {submitLabel}
            </button>
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
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
             </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
            <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
                Abbrechen
            </button>
            <button
                type="button"
                onClick={showCroppedImage}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
                Fertig
            </button>
        </div>
    </Modal>
    </>
  );
}
