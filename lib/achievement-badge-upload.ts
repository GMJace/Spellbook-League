import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const ACHIEVEMENT_BADGE_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "achievement-badges",
);
const ACHIEVEMENT_BADGE_PUBLIC_PATH_PREFIX = "/uploads/achievement-badges/";
const MAX_ACHIEVEMENT_BADGE_SIZE = 5 * 1024 * 1024;

const achievementBadgeMimeTypeExtensions: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function getAchievementBadgeUpload(
  value: FormDataEntryValue | null,
): File | null {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export function validateAchievementBadgeUpload(file: File) {
  if (!(file.type in achievementBadgeMimeTypeExtensions)) {
    throw new Error("Upload a PNG, JPG, WEBP, or GIF badge image.");
  }

  if (file.size > MAX_ACHIEVEMENT_BADGE_SIZE) {
    throw new Error("Badge images must be 5 MB or smaller.");
  }
}

export async function saveAchievementBadgeUpload(file: File) {
  validateAchievementBadgeUpload(file);

  await mkdir(ACHIEVEMENT_BADGE_UPLOAD_DIRECTORY, { recursive: true });

  const extension = achievementBadgeMimeTypeExtensions[file.type];
  const fileName = `${randomUUID()}${extension}`;
  const outputPath = path.join(ACHIEVEMENT_BADGE_UPLOAD_DIRECTORY, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(outputPath, buffer);

  return `${ACHIEVEMENT_BADGE_PUBLIC_PATH_PREFIX}${fileName}`;
}

export async function removeAchievementBadgeUpload(
  badgeImagePath?: string | null,
) {
  if (!badgeImagePath?.startsWith(ACHIEVEMENT_BADGE_PUBLIC_PATH_PREFIX)) {
    return;
  }

  const fileName = path.basename(badgeImagePath);
  const outputPath = path.join(ACHIEVEMENT_BADGE_UPLOAD_DIRECTORY, fileName);

  try {
    await unlink(outputPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
