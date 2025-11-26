import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function loader({ params }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "uploads", filename);

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (error) {
    throw new Response("Not Found", { status: 404 });
  }

  const fileStream = fs.createReadStream(filePath);
  // Transform the Node.js Readable stream into a Web ReadableStream
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

  // Determine content type (basic check, could be improved)
  let contentType = "application/octet-stream";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
    contentType = "image/jpeg";
  } else if (filename.endsWith(".png")) {
    contentType = "image/png";
  } else if (filename.endsWith(".webp")) {
    contentType = "image/webp";
  } else if (filename.endsWith(".svg")) {
    contentType = "image/svg+xml";
  }

  return new Response(readableStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
