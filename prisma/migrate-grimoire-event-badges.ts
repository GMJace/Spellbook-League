import { PrismaClient } from "@prisma/client";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const LEGACY_EVENT_BADGE_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "grimoire-event-badges",
);

const legacyEventBadgeMimeTypes = [
  { extension: ".gif", mimeType: "image/gif" },
  { extension: ".jpg", mimeType: "image/jpeg" },
  { extension: ".png", mimeType: "image/png" },
  { extension: ".webp", mimeType: "image/webp" },
];

async function getLegacyEventBadgeDataUrl(eventId: string) {
  for (const { extension, mimeType } of legacyEventBadgeMimeTypes) {
    const filePath = path.join(LEGACY_EVENT_BADGE_DIRECTORY, `${eventId}${extension}`);

    try {
      await access(filePath);
      const buffer = await readFile(filePath);

      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch {
      // Try the next supported legacy extension.
    }
  }

  return null;
}

async function main() {
  const columns = await prisma.$queryRaw<Array<{ name: string }>>`
    PRAGMA table_info("GrimoireEvent")
  `;

  if (!columns.some((column) => column.name === "badgeImagePath")) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "GrimoireEvent" ADD COLUMN "badgeImagePath" TEXT',
    );
    console.log("Added GrimoireEvent.badgeImagePath");
  } else {
    console.log("GrimoireEvent.badgeImagePath already exists");
  }

  const events = await prisma.grimoireEvent.findMany({
    where: {
      badgeImagePath: null,
    },
    select: {
      id: true,
    },
  });
  let backfilledCount = 0;

  for (const event of events) {
    const badgeImagePath = await getLegacyEventBadgeDataUrl(event.id);

    if (!badgeImagePath) {
      continue;
    }

    await prisma.grimoireEvent.update({
      where: {
        id: event.id,
      },
      data: {
        badgeImagePath,
      },
    });
    backfilledCount += 1;
  }

  console.log(`Backfilled ${backfilledCount} legacy Grimoire event badge upload(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
