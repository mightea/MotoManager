import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";
import { getDb } from "~/db";
import { documents } from "~/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "~/services/auth.server"; // Or requireUser if we want to redirect, but for resources 403 is better

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

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  // Security check
  const db = await getDb();
  // We assume filePath ends with the filename. 
  // Stored as /data/documents/uuid.pdf
  const searchPath = `/data/documents/${filename}`;
  
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.filePath, searchPath))
    .limit(1);

  if (!doc) {
     // Try without leading slash if stored differently? 
     // The action stores it as `/data/documents/${fileName}`.
     throw new Response("Not Found", { status: 404 });
  }

  if (doc.isPrivate) {
    const { user } = await getCurrentSession(request);
    
    if (!user || user.id !== doc.ownerId) {
        throw new Response("Unauthorized", { status: 403 });
    }
  }

  const filePath = path.join(process.cwd(), "data", "documents", filename);
  const extension = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
  const safeTitleBase = (doc.title || "document").replace(/[^\w.-]+/g, "_");
  const downloadName = `${safeTitleBase}${extension || ""}`;

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (error) {
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
      "Cache-Control": doc.isPrivate ? "no-store" : "public, max-age=3600",
    },
  });
}
