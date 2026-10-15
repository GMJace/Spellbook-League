import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CURATED_IMAGE_DIRECTORY = path.join(process.cwd(), "public", "magic-item-cards");
const CURATED_IMAGE_PREFIX = "/magic-item-cards/";
const UPLOAD_IMAGE_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "magic-item-cards",
);
const UPLOAD_IMAGE_PREFIX = "/uploads/magic-item-cards/";
const MAX_CARD_IMAGE_SIZE = 10 * 1024 * 1024;

const imageExtensionsByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const supportedImageExtensions = new Set(Object.values(imageExtensionsByMimeType));

export type MagicItemCardImageOption = {
  label: string;
  path: string;
};

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "magic-item-card";
}

async function listImagesInDirectory(directory: string, publicPathPrefix: string) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => {
        const extension = path.extname(entry.name).toLowerCase();
        return entry.isFile() && supportedImageExtensions.has(extension);
      })
      .map((entry) => ({
        label: entry.name,
        path: `${publicPathPrefix}${entry.name}`,
      }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function listMagicItemCardImages(): Promise<MagicItemCardImageOption[]> {
  const images = (
    await Promise.all([
      listImagesInDirectory(CURATED_IMAGE_DIRECTORY, CURATED_IMAGE_PREFIX),
      listImagesInDirectory(UPLOAD_IMAGE_DIRECTORY, UPLOAD_IMAGE_PREFIX),
    ])
  ).flat();

  return images.sort((left, right) => left.label.localeCompare(right.label));
}

export function getMagicItemCardImageUpload(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function saveMagicItemCardImageUpload(
  file: File,
  itemName: string,
  side: "back" | "front",
) {
  const extension = imageExtensionsByMimeType[file.type];

  if (!extension) {
    throw new Error("CARD_IMAGE_TYPE_INVALID");
  }

  if (file.size > MAX_CARD_IMAGE_SIZE) {
    throw new Error("CARD_IMAGE_TOO_LARGE");
  }

  await mkdir(UPLOAD_IMAGE_DIRECTORY, { recursive: true });

  const fileName = `${slugifyFileName(itemName)}-${side}-${crypto.randomUUID()}${extension}`;
  const outputPath = path.join(UPLOAD_IMAGE_DIRECTORY, fileName);

  await writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

  return `${UPLOAD_IMAGE_PREFIX}${fileName}`;
}

export async function removeMagicItemCardImageUpload(imagePath?: string | null) {
  if (!imagePath?.startsWith(UPLOAD_IMAGE_PREFIX)) {
    return;
  }

  const outputPath = path.join(UPLOAD_IMAGE_DIRECTORY, path.basename(imagePath));

  try {
    await unlink(outputPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
