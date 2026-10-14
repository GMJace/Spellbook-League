import { randomUUID } from "node:crypto";
import { copyFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableColumnRow = {
  name: string;
};

type ExistingCardRow = {
  backImagePath: string;
  countsAs: string;
  flavorNotes: string;
  frontImagePath: string;
  itemName: string;
  limitedEditionLimit: number | null;
  minorProperty: string;
  rarity: string;
};

type DefinitionRow = {
  id: string;
  itemName: string;
};

const defaultCardDefinitions = [
  {
    backImagePath: "/magic-item-cards/dagger-of-the-blackrose-back.jpg",
    countsAs: "+3 Weapon, Dagger",
    flavorNotes:
      "Bestowed upon knights sworn to Lord Soth, the Dagger of the Black Rose bears the charred rose of the fallen Solamnic lord, whose refusal to fulfill his redemption doomed him and his loyal retainers to undeath. Each abyssal blade imprisons a creature drawn from the void, sealed within its steel by binding runes woven during the knight oath of fealty. Its presence stirs as a crawling shadow beneath the metal, whispering in Abyssal whenever the dagger is drawn. To carry one is to bear both Soth favour and a captive horror, an enduring reminder that service to the Knight of the Black Rose does not end with death.",
    frontImagePath: "/magic-item-cards/dagger-of-the-blackrose-front.jpg",
    itemName: "Dagger of the Blackrose",
    limitedEditionLimit: 30,
    minorProperty: "Language: Abyssal",
    rarity: "Very Rare",
  },
];

async function backupDatabaseFile() {
  const databasePath = path.join(process.cwd(), "prisma", "dev.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${databasePath}.backup-${stamp}`;

  await copyFile(databasePath, backupPath);

  return backupPath;
}

async function main() {
  const definitionTables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'MagicItemCardDefinition'",
  );
  const cardColumns = await prisma.$queryRawUnsafe<TableColumnRow[]>(
    'PRAGMA table_info("MagicItemCard")',
  );
  const definitionColumns = definitionTables.length
    ? await prisma.$queryRawUnsafe<TableColumnRow[]>(
        'PRAGMA table_info("MagicItemCardDefinition")',
      )
    : [];
  const needsDefinitionTable = definitionTables.length === 0;
  const needsDefinitionId = !cardColumns.some((column) => column.name === "definitionId");
  const needsAwardedCount =
    !needsDefinitionTable &&
    !definitionColumns.some((column) => column.name === "awardedCount");

  if (!needsDefinitionTable && !needsDefinitionId && !needsAwardedCount) {
    console.log("Magic item card catalog structure already exists. Checking backfill.");
  } else {
    const backupPath = await backupDatabaseFile();
    console.log(`Backed up prisma/dev.db to ${backupPath}`);
  }

  if (needsDefinitionTable) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "MagicItemCardDefinition" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "frontImagePath" TEXT NOT NULL,
        "backImagePath" TEXT NOT NULL,
        "itemName" TEXT NOT NULL,
        "countsAs" TEXT NOT NULL DEFAULT '',
        "minorProperty" TEXT NOT NULL DEFAULT '',
        "rarity" TEXT NOT NULL DEFAULT '',
        "flavorNotes" TEXT NOT NULL DEFAULT '',
        "awardedCount" INTEGER NOT NULL DEFAULT 0,
        "limitedEditionLimit" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "MagicItemCardDefinition_itemName_key" ON "MagicItemCardDefinition"("itemName")',
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "MagicItemCardDefinition_itemName_idx" ON "MagicItemCardDefinition"("itemName")',
    );
  }

  if (needsDefinitionId) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "MagicItemCard" ADD COLUMN "definitionId" TEXT',
    );
  }

  if (needsAwardedCount) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "MagicItemCardDefinition" ADD COLUMN "awardedCount" INTEGER NOT NULL DEFAULT 0',
    );
  }

  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "MagicItemCard_definitionId_idx" ON "MagicItemCard"("definitionId")',
  );

  const existingCards = await prisma.$queryRawUnsafe<ExistingCardRow[]>(`
    SELECT
      "backImagePath",
      "countsAs",
      "flavorNotes",
      "frontImagePath",
      "itemName",
      "limitedEditionLimit",
      "minorProperty",
      "rarity"
    FROM "MagicItemCard"
    GROUP BY "itemName"
    ORDER BY "createdAt" ASC
  `);
  const definitions = await prisma.$queryRawUnsafe<DefinitionRow[]>(
    'SELECT "id", "itemName" FROM "MagicItemCardDefinition"',
  );
  const definitionIdByName = new Map(
    definitions.map((definition) => [definition.itemName, definition.id]),
  );

  for (const card of existingCards) {
    let definitionId = definitionIdByName.get(card.itemName);

    if (!definitionId) {
      definitionId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "MagicItemCardDefinition" (
          "id", "frontImagePath", "backImagePath", "itemName", "countsAs",
          "minorProperty", "rarity", "flavorNotes", "awardedCount", "limitedEditionLimit",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        definitionId,
        card.frontImagePath,
        card.backImagePath,
        card.itemName,
        card.countsAs,
        card.minorProperty,
        card.rarity,
        card.flavorNotes,
        card.limitedEditionLimit,
      );
      definitionIdByName.set(card.itemName, definitionId);
    }

    await prisma.$executeRawUnsafe(
      'UPDATE "MagicItemCard" SET "definitionId" = ? WHERE "itemName" = ? AND "definitionId" IS NULL',
      definitionId,
      card.itemName,
    );
  }

  for (const card of defaultCardDefinitions) {
    if (definitionIdByName.has(card.itemName)) {
      continue;
    }

    const definitionId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MagicItemCardDefinition" (
        "id", "frontImagePath", "backImagePath", "itemName", "countsAs",
        "minorProperty", "rarity", "flavorNotes", "awardedCount", "limitedEditionLimit",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      definitionId,
      card.frontImagePath,
      card.backImagePath,
      card.itemName,
      card.countsAs,
      card.minorProperty,
      card.rarity,
      card.flavorNotes,
      card.limitedEditionLimit,
    );
    definitionIdByName.set(card.itemName, definitionId);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "MagicItemCardDefinition"
    SET "awardedCount" = MAX(
      "awardedCount",
      COALESCE((
        SELECT MAX("limitedEditionNumber")
        FROM "MagicItemCard"
        WHERE "MagicItemCard"."definitionId" = "MagicItemCardDefinition"."id"
      ), 0),
      COALESCE((
        SELECT COUNT(*)
        FROM "MagicItemCard"
        WHERE "MagicItemCard"."definitionId" = "MagicItemCardDefinition"."id"
      ), 0)
    )
  `);

  console.log(`Magic item card catalog ready with ${definitionIdByName.size} definition(s).`);
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
