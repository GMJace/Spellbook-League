import { convertImageFileToDataUrl } from "@/lib/image-data-url";

const MAX_GRIMOIRE_EVENT_BADGE_SIZE = 10 * 1024 * 1024;

const grimoireEventBadgeMimeTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function saveGrimoireEventBadgeUpload(file: File) {
  if (!grimoireEventBadgeMimeTypes.has(file.type)) {
    return { error: "Event badge must be a PNG, JPG, WEBP, or GIF image." } as const;
  }

  if (file.size > MAX_GRIMOIRE_EVENT_BADGE_SIZE) {
    return { error: "Event badge must be 10 MB or smaller." } as const;
  }

  return { path: await convertImageFileToDataUrl(file) } as const;
}
