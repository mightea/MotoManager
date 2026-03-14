import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";

export async function loader({ params }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "data", "previews", filename);

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
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
