import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const TOKEN_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "tokens"
);
const TOKEN_PUBLIC_PATH_PREFIX = "/uploads/tokens/";
const MAX_TOKEN_IMAGE_SIZE = 5 * 1024 * 1024;

const tokenMimeTypeExtensions: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function getTokenImageUpload(
  value: FormDataEntryValue | null
): File | null {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export function validateTokenImageUpload(file: File) {
  if (!(file.type in tokenMimeTypeExtensions)) {
    throw new Error("Upload a PNG, JPG, WEBP, or GIF token image.");
  }

  if (file.size > MAX_TOKEN_IMAGE_SIZE) {
    throw new Error("Token images must be 5 MB or smaller.");
  }
}

export async function saveTokenImageUpload(
  file: File,
  previousTokenImagePath?: string | null
) {
  validateTokenImageUpload(file);

  await mkdir(TOKEN_UPLOAD_DIRECTORY, { recursive: true });

  const extension = tokenMimeTypeExtensions[file.type];
  const fileName = `${randomUUID()}${extension}`;
  const outputPath = path.join(TOKEN_UPLOAD_DIRECTORY, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(outputPath, buffer);
  await removeTokenImageUpload(previousTokenImagePath);

  return `${TOKEN_PUBLIC_PATH_PREFIX}${fileName}`;
}

export async function removeTokenImageUpload(
  tokenImagePath?: string | null
) {
  if (!tokenImagePath?.startsWith(TOKEN_PUBLIC_PATH_PREFIX)) {
    return;
  }

  const fileName = path.basename(tokenImagePath);
  const outputPath = path.join(TOKEN_UPLOAD_DIRECTORY, fileName);

  try {
    await unlink(outputPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
