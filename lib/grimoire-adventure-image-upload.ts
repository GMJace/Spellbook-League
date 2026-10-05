import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GRIMOIRE_ADVENTURE_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "grimoire-adventures",
);
const GRIMOIRE_ADVENTURE_PUBLIC_PATH_PREFIX = "/uploads/grimoire-adventures/";
const MAX_GRIMOIRE_ADVENTURE_IMAGE_SIZE = 20 * 1024 * 1024;

const grimoireAdventureImageExtensions: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function saveGrimoireAdventureImageUpload(file: File) {
  const extension = grimoireAdventureImageExtensions[file.type];

  if (!extension) {
    return { error: "Adventure cover must be a PNG, JPG, WEBP, or GIF image." } as const;
  }

  if (file.size > MAX_GRIMOIRE_ADVENTURE_IMAGE_SIZE) {
    return { error: "Adventure cover must be 20 MB or smaller." } as const;
  }

  await mkdir(GRIMOIRE_ADVENTURE_UPLOAD_DIRECTORY, { recursive: true });

  const fileName = `${crypto.randomUUID()}${extension}`;
  const outputPath = path.join(GRIMOIRE_ADVENTURE_UPLOAD_DIRECTORY, fileName);

  await writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

  return { path: `${GRIMOIRE_ADVENTURE_PUBLIC_PATH_PREFIX}${fileName}` } as const;
}
