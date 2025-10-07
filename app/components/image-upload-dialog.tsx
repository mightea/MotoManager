import { useState, useRef, type ReactNode } from "react";
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
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Input } from "./ui/input";

// Helper function to generate cropped image from a canvas
function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.9); // Use JPEG for better compression
}

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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || ""),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
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
    };
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Bild hochladen und zuschneiden</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!imgSrc ? (
            <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-md">
              <p>Wähle eine Bilddatei von deinem Gerät.</p>
              <Input
                id="picture"
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="max-w-xs"
              />
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
