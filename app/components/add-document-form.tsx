import { useState, useCallback, useEffect } from "react";
import { useNavigation, useSubmit } from "react-router";
import { Button } from "./button";
import clsx from "clsx";
import type { Document, Motorcycle } from "~/db/schema";
import { Switch } from "@headlessui/react";
import { Trash2, Bike, Upload, X, FileText, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface AddDocumentFormProps {
  document?: Pick<Document, "id" | "title" | "isPrivate" | "previewPath" | "filePath">;
  motorcycles: (Motorcycle & { ownerName: string | null })[];
  assignedMotorcycleIds?: number[];
  onSubmit: () => void;
  onDelete?: () => void;
}

export function AddDocumentForm({ document, motorcycles, assignedMotorcycleIds = [], onSubmit, onDelete }: AddDocumentFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [isPrivate, setIsPrivate] = useState(document?.isPrivate ?? false);
  const [selectedMotorcycles, setSelectedMotorcycles] = useState<number[]>(assignedMotorcycleIds);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "");

  const isEditMode = !!document;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    if (selectedFile.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setFilePreviewUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".heic", ".heif", ".tif", ".tiff"],
    },
    maxFiles: 1,
    multiple: false,
  });

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const toggleMotorcycle = (id: number) => {
    setSelectedMotorcycles((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isEditMode && !file) {
        setError("Bitte wähle eine Datei aus.");
        return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append("intent", isEditMode ? "update" : "create");
    formData.append("isPrivate", isPrivate ? "true" : "false");
    
    if (isEditMode && document) {
        formData.append("id", document.id.toString());
    }

    if (file) {
        formData.append("file", file);
    }

    // Append selected motorcycles
    // FormData doesn't support arrays directly, append multiple times
    selectedMotorcycles.forEach(id => {
        formData.append("motorcycleIds", id.toString());
    });

    submit(formData, {
        method: "post",
        encType: "multipart/form-data",
    });
    
    // We let the parent handle closing, or we could call onSubmit() if we want optimistic close
    // But usually we wait for action result. The parent can listen to actionData.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* File Upload / Preview Section */}
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Datei
        </span>

        {/* Existing Document Preview (if in edit mode and no new file selected) */}
        {isEditMode && !file && document ? (
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-navy-700 dark:bg-navy-800">
                <div className="flex p-4 gap-4 items-center">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-900 border border-gray-100 dark:border-navy-600">
                        {document.previewPath ? (
                            <img src={document.previewPath} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground dark:text-white">
                            {document.filePath.split('/').pop()}
                        </p>
                        <p className="text-xs text-secondary dark:text-navy-400">
                            Aktuelles Dokument
                        </p>
                    </div>
                    <div {...getRootProps()} className="cursor-pointer rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-secondary hover:bg-gray-100 hover:text-primary dark:bg-navy-700 dark:text-navy-300 dark:hover:bg-navy-600 dark:hover:text-primary-light">
                        <input {...getInputProps()} />
                        Ersetzen
                    </div>
                </div>
            </div>
        ) : (
            // Dropzone (Create mode OR Edit mode with new file selected)
            !file ? (
                <div
                    {...getRootProps()}
                    className={clsx(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer",
                    isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="mb-2 rounded-full bg-gray-100 p-2 dark:bg-navy-700">
                        <Upload className="h-5 w-5 text-gray-400 dark:text-navy-300" />
                    </div>
                    <p className="text-center text-sm font-medium text-gray-900 dark:text-white">
                        {isEditMode ? "Neues Dokument hochladen" : "Datei auswählen"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        PDF oder Bilddatei
                    </p>
                </div>
            ) : (
                // Selected New File
                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-navy-700 dark:bg-navy-800">
                    <div className="flex p-4 gap-4 items-center">
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-900 flex items-center justify-center border border-gray-100 dark:border-navy-600">
                            {filePreviewUrl ? (
                                <img src={filePreviewUrl} alt="Ausgewählte Datei" className="h-full w-full object-cover" />
                            ) : (
                                <FileText className="h-8 w-8 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground dark:text-white">
                                {file.name}
                            </p>
                            <p className="text-xs text-secondary dark:text-navy-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • Neu
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setFile(null);
                                setFilePreviewUrl(null);
                                setError(null);
                            }}
                            className="rounded-lg p-2 text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )
        )}
        
        {error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
            </div>
        )}
      </div>

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Titel
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={document?.title ?? (file ? stripExtension(file.name) : "")}
            required
            placeholder="Dokumenten Titel"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white sm:text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label
          htmlFor="isPrivate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Privat (nur für mich sichtbar)
        </label>
        <Switch
            checked={isPrivate}
            onChange={setIsPrivate}
            className={clsx(
                isPrivate ? 'bg-primary' : 'bg-gray-200 dark:bg-navy-700',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
        >
            <span className="sr-only">Privat Einstellung</span>
            <span
                aria-hidden="true"
                className={clsx(
                    isPrivate ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                )}
            />
        </Switch>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Zugeordnete Fahrzeuge
        </span>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {motorcycles.length === 0 ? (
            <p className="text-xs text-secondary dark:text-navy-400">Keine Fahrzeuge verfügbar.</p>
          ) : (
            motorcycles.map((moto) => (
              <div key={moto.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`moto-${moto.id}`}
                  checked={selectedMotorcycles.includes(moto.id)}
                  onChange={() => toggleMotorcycle(moto.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:checked:bg-primary"
                />
                <label htmlFor={`moto-${moto.id}`} className="flex items-center gap-2 text-sm text-foreground dark:text-white cursor-pointer select-none">
                  <Bike className="h-4 w-4 text-secondary dark:text-navy-400" />
                  {moto.make} {moto.model} 
                  <span className="text-xs text-secondary dark:text-navy-400">
                    (Besitzer: {moto.ownerName || "Unbekannt"})
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-between gap-3 pt-2">
        {isEditMode ? (
            <button
                type="button"
                onClick={onDelete}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/30"
                title="Dokument löschen"
            >
                <Trash2 className="h-5 w-5" />
            </button>
        ) : (
            <button
                type="button"
                onClick={onSubmit} // Use onSubmit as Cancel for create mode
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
            >
                Abbrechen
            </button>
        )}
        
        <Button
            type="submit"
            disabled={isSubmitting || (!isEditMode && !file)}
            className="w-full sm:w-auto"
        >
            {isSubmitting ? "Speichern..." : (isEditMode ? "Speichern" : "Hochladen")}
        </Button>
      </div>
    </form>
  );
}
