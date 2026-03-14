import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "data", "documents", filename);
  const extension = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
  const downloadName = filename;

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch {
    throw new Response("Not Found", { status: 404 });
  }

  const fileStream = fs.createReadStream(filePath);
  const readableStream = new ReadableStream({
    start(controller) {
      fileStream.on("data", (chunk) => controller.enqueue(chunk));
      fileStream.on("end", () => controller.close());
      fileStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${downloadName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
