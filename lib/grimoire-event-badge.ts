import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GRIMOIRE_EVENT_BADGE_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "grimoire-event-badges",
);
const GRIMOIRE_EVENT_BADGE_PUBLIC_PATH_PREFIX = "/uploads/grimoire-event-badges/";
const MAX_GRIMOIRE_EVENT_BADGE_SIZE = 10 * 1024 * 1024;

const grimoireEventBadgeExtensions: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function getEventBadgeOutputPath(eventId: string, extension: string) {
  return path.join(GRIMOIRE_EVENT_BADGE_UPLOAD_DIRECTORY, `${eventId}${extension}`);
}

export async function getGrimoireEventBadgePathIfExists(eventId: string) {
  for (const extension of Object.values(grimoireEventBadgeExtensions)) {
    const outputPath = getEventBadgeOutputPath(eventId, extension);

    try {
      await access(outputPath);
      return `${GRIMOIRE_EVENT_BADGE_PUBLIC_PATH_PREFIX}${eventId}${extension}`;
    } catch {
      // Try the next known extension.
    }
  }

  return null;
}

export async function saveGrimoireEventBadgeUpload(eventId: string, file: File) {
  const extension = grimoireEventBadgeExtensions[file.type];

  if (!extension) {
    return { error: "Event badge must be a PNG, JPG, WEBP, or GIF image." } as const;
  }

  if (file.size > MAX_GRIMOIRE_EVENT_BADGE_SIZE) {
    return { error: "Event badge must be 10 MB or smaller." } as const;
  }

  await mkdir(GRIMOIRE_EVENT_BADGE_UPLOAD_DIRECTORY, { recursive: true });

  const outputPath = getEventBadgeOutputPath(eventId, extension);
  await writeFile(outputPath, Buffer.from(await file.arrayBuffer()));

  return { path: `${GRIMOIRE_EVENT_BADGE_PUBLIC_PATH_PREFIX}${eventId}${extension}` } as const;
}
