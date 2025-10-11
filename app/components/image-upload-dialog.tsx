import { useState, useRef, type ReactNode } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "./ui/input";
import { cn } from "~/utils/tw";
import { UploadCloud } from "lucide-react";

type ImageUploadDialogProps = {
  children: ReactNode;
  onCropComplete: (croppedImageUrl: string) => void;
  aspectRatio?: number;
};

export function ImageUploadDialog({
  children,
  onCropComplete,
  aspectRatio = 16 / 9,
}: ImageUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsDragActive(false);
    setCrop(undefined);
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      setImgSrc(reader.result?.toString() || ""),
    );
    reader.readAsDataURL(files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspectRatio,
        width,
        height,
      ),
      width,
      height,
    );
    setCrop(crop);
    setCompletedCrop(crop);
  }

  async function handleCrop() {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const offscreen = new OffscreenCanvas(
      crop.width * scaleX,
      crop.height * scaleY,
    );
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      throw new Error("No 2d context");
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY,
    );

    // Convert OffscreenCanvas to a Blob, then to a data URL
    const blob = await offscreen.convertToBlob({
      type: "image/jpeg",
      quality: 0.9,
    });
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      onCropComplete(reader.result as string);
      setOpen(false);
      setImgSrc(""); // Reset for next time
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
  }

  const mainContent = (
    <>
      <DialogHeader>
        <DialogTitle>Bild hochladen und zuschneiden</DialogTitle>
      </DialogHeader>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-4">
        {!imgSrc ? (
          <>
            <label
              htmlFor="picture"
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!isDragActive) {
                  setIsDragActive(true);
                }
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragActive(false);
                handleFiles(event.dataTransfer.files);
              }}
              className={cn(
                "flex flex-1 min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/40 bg-muted/40 px-6 py-16 text-center transition-colors hover:border-muted-foreground/60 hover:bg-muted/60",
                isDragActive && "border-primary bg-primary/10",
              )}
            >
              <UploadCloud className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  Bild hierher ziehen oder klicken
                </p>
                <p className="text-sm text-muted-foreground">
                  Unterstützt JPG, PNG und GIF bis 10 MB
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Datei auswählen
              </Button>
            </label>
            <Input
              ref={fileInputRef}
              id="picture"
              type="file"
              accept="image/*"
              onChange={onSelectFile}
              className="sr-only"
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={100}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                onLoad={onImageLoad}
                className="max-h-[60vh] object-contain"
              />
            </ReactCrop>
            {/* Hidden canvas for drawing the cropped image */}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        )}
      </div>
      <DialogFooter>
        {imgSrc && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setImgSrc("")}
          >
            Anderes Bild wählen
          </Button>
        )}
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Abbrechen
          </Button>
        </DialogClose>
        <Button onClick={handleCrop} disabled={!completedCrop || !imgSrc}>
          Zuschneiden und Speichern
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}
