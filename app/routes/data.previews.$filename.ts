import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";
import { getDb } from "~/db";
import { documents } from "~/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "~/services/auth.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  // Security check
  const db = await getDb();
  const searchPath = `/data/previews/${filename}`;
  
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.previewPath, searchPath))
    .limit(1);

  // If no doc found for this preview, maybe it's orphaned or I made a mistake?
  // But strictly we should check.
  if (doc && doc.isPrivate) {
    const session = await getSession(request.headers.get("Cookie"));
    const userId = session.get("userId");
    
    if (!userId || userId !== doc.ownerId) {
        // Option: serve a generic "Private" placeholder image instead of 403?
        // For now, 403.
        throw new Response("Unauthorized", { status: 403 });
    }
  }

  const filePath = path.join(process.cwd(), "data", "previews", filename);

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
      "Content-Type": "image/jpeg",
      "Cache-Control": doc?.isPrivate ? "no-store" : "public, max-age=31536000",
    },
  });
}
