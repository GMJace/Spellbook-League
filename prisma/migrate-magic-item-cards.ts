import { copyFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableListRow = {
  name: string;
};

async function backupDatabaseFile() {
  const databasePath = path.join(process.cwd(), "prisma", "dev.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${databasePath}.backup-${stamp}`;

  await copyFile(databasePath, backupPath);

  return backupPath;
}

async function main() {
  const tables = await prisma.$queryRawUnsafe<TableListRow[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'MagicItemCard'",
  );

  if (tables.length) {
    console.log("MagicItemCard table already exists. No migration needed.");
    return;
  }

  const backupPath = await backupDatabaseFile();
  console.log(`Backed up prisma/dev.db to ${backupPath}`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "MagicItemCard" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "characterId" TEXT NOT NULL,
      "gameParticipantId" TEXT,
      "frontImagePath" TEXT NOT NULL,
      "backImagePath" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "countsAs" TEXT NOT NULL DEFAULT '',
      "minorProperty" TEXT NOT NULL DEFAULT '',
      "rarity" TEXT NOT NULL DEFAULT '',
      "flavorNotes" TEXT NOT NULL DEFAULT '',
      "adventureTitle" TEXT NOT NULL DEFAULT '',
      "limitedEditionNumber" INTEGER,
      "limitedEditionLimit" INTEGER,
      "isCarried" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "MagicItemCard_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MagicItemCard_gameParticipantId_fkey" FOREIGN KEY ("gameParticipantId") REFERENCES "GameParticipant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(
    'CREATE INDEX "MagicItemCard_characterId_createdAt_idx" ON "MagicItemCard"("characterId", "createdAt")',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX "MagicItemCard_gameParticipantId_idx" ON "MagicItemCard"("gameParticipantId")',
  );

  console.log("Added MagicItemCard table.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
