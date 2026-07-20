import { unlink } from "fs/promises";
import path from "path";
import { convertImageFileToDataUrl } from "@/lib/image-data-url";

const PROFILE_IMAGE_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "profile-images"
);
const PROFILE_IMAGE_PUBLIC_PATH_PREFIX = "/uploads/profile-images/";
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const profileImageMimeTypeExtensions: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function getProfileImageUpload(
  value: FormDataEntryValue | null
): File | null {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export function validateProfileImageUpload(file: File) {
  if (!(file.type in profileImageMimeTypeExtensions)) {
    throw new Error("Upload a PNG, JPG, WEBP, or GIF profile image.");
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error("Profile images must be 5 MB or smaller.");
  }
}

export async function saveProfileImageUpload(file: File) {
  validateProfileImageUpload(file);
  return convertImageFileToDataUrl(file);
}

export async function removeProfileImageUpload(
  profileImagePath?: string | null
) {
  if (!profileImagePath?.startsWith(PROFILE_IMAGE_PUBLIC_PATH_PREFIX)) {
    return;
  }

  const fileName = path.basename(profileImagePath);
  const outputPath = path.join(PROFILE_IMAGE_UPLOAD_DIRECTORY, fileName);

  try {
    await unlink(outputPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
