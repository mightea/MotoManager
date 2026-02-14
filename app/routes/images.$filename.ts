import { type LoaderFunctionArgs } from "react-router";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { filename } = params;
  if (!filename) {
    throw new Response("Not Found", { status: 404 });
  }

  // Assert filename as string after the null check
  const actualFilename: string = filename;

  const url = new URL(request.url);

  const widthParam = url.searchParams.get("width");
  const heightParam = url.searchParams.get("height");

  const parsedWidth = widthParam ? parseInt(widthParam, 10) : NaN;
  const parsedHeight = heightParam ? parseInt(heightParam, 10) : NaN;

  const width = !isNaN(parsedWidth) && parsedWidth > 0 ? parsedWidth : null;
  const height = !isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : null;

  const originalFilePath = path.join(process.cwd(), "data", "images", actualFilename);

  try {
    await fs.promises.access(originalFilePath, fs.constants.F_OK);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Response("Not Found", { status: 404 });
  }

  // If no resizing requested, serve original
  if (!width && !height) {
    return serveFile(originalFilePath, actualFilename);
  }

  // Check cache
  const cacheDir = path.join(process.cwd(), "data", "images", "cache");
  const cacheKey = `${path.basename(actualFilename, path.extname(actualFilename))}_w${width || 'auto'}_h${height || 'auto'}.webp`;
  const cacheFilePath = path.join(cacheDir, cacheKey);
  console.log(`Image loader: Checking cache for ${cacheFilePath}`);

  try {
    await fs.promises.access(cacheFilePath, fs.constants.F_OK);
    return serveFile(cacheFilePath, cacheKey);
  } catch {
    // Cache miss, proceed to generate
  }

  try {
    // Create cache dir if not exists (although we created it via shell, good to be safe)
    await fs.promises.mkdir(cacheDir, { recursive: true });

    const pipeline = sharp(originalFilePath);

    pipeline.resize({
      width: width || undefined,
      height: height || undefined,
      fit: 'cover',
      withoutEnlargement: true
    });

    // Force webp for cached images as it is generally smaller and we are using it elsewhere
    await pipeline.webp({ quality: 80 }).toFile(cacheFilePath);

    return serveFile(cacheFilePath, actualFilename);
  } catch (error) {
    console.error("[Images Loader] Error resizing image:", error);
    // Fallback to original if resize fails
    return serveFile(originalFilePath, actualFilename);
  }
}

function serveFile(filePath: string, filename: string) {
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

  let contentType = "application/octet-stream";
  if (filename.endsWith(".webp")) {
    contentType = "image/webp";
  } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
    contentType = "image/jpeg";
  } else if (filename.endsWith(".png")) {
    contentType = "image/png";
  } else if (filename.endsWith(".svg")) {
    contentType = "image/svg+xml";
  }

  const cacheControl = process.env.NODE_ENV === "development"
    ? "no-store"
    : "public, max-age=31536000, immutable";

  return new Response(readableStream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}
