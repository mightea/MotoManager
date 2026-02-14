import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

export async function processImageUpload(file: File): Promise<string> {
    const newFilename = `${uuidv4()}.webp`;
    const uploadPath = path.join(process.cwd(), "data", "images", newFilename);

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(uploadPath), { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await sharp(buffer).webp({ quality: 80 }).toFile(uploadPath);

    return `/data/images/${newFilename}`;
}
