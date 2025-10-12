import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const DOCUMENTS_BASE_DIR = path.join(process.cwd(), "public", "documents");
export const DOCUMENT_FILES_DIR = path.join(DOCUMENTS_BASE_DIR, "files");
export const DOCUMENT_PREVIEWS_DIR = path.join(DOCUMENTS_BASE_DIR, "previews");

export const DOCUMENT_FILES_PUBLIC_BASE = "/documents/files";
export const DOCUMENT_PREVIEWS_PUBLIC_BASE = "/documents/previews";

export const resolvePublicFilePath = (relativePath: string) =>
  path.join(process.cwd(), "public", relativePath.replace(/^\/+/, ""));

export async function ensureDocumentDirs() {
  await fs.mkdir(DOCUMENT_FILES_DIR, { recursive: true });
  await fs.mkdir(DOCUMENT_PREVIEWS_DIR, { recursive: true });
}

export async function deleteFileIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

const execFileAsync = promisify(execFile);

export async function generatePdfPreview(
  pdfPath: string,
  outputPath: string,
): Promise<boolean> {
  try {
    const platform = process.platform;

    if (platform === "darwin") {
      await execFileAsync("sips", [
        "-s",
        "format",
        "png",
        pdfPath,
        "--out",
        outputPath,
      ]);
    } else if (platform === "linux") {
      const { dir, name } = path.parse(outputPath);
      const outputPrefix = path.join(dir, name);

      await execFileAsync("pdftoppm", [
        "-singlefile",
        "-png",
        pdfPath,
        outputPrefix,
      ]);

      const generatedPath = `${outputPrefix}.png`;
      if (generatedPath !== outputPath) {
        await deleteFileIfExists(outputPath);
        await fs.rename(generatedPath, outputPath);
      }
    } else {
      throw new Error(
        `Unsupported platform '${platform}' for preview generation`,
      );
    }

    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    await deleteFileIfExists(outputPath);
    return false;
  }
}
