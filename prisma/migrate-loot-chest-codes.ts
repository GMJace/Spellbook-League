import { copyFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { generateChestCode } from "../lib/loot-chest";

const prisma = new PrismaClient();

type TableInfoRow = {
  name: string;
};

type IndexListRow = {
  name: string;
};

type ParticipantBackfillRow = {
  id: string;
};

async function backupDatabaseFile() {
  const databasePath = path.join(process.cwd(), "prisma", "dev.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${databasePath}.backup-${stamp}`;

  await copyFile(databasePath, backupPath);

  return backupPath;
}

async function main() {
  const tableInfo = await prisma.$queryRawUnsafe<TableInfoRow[]>('PRAGMA table_info("GameParticipant")');
  const hasChestCodeColumn = tableInfo.some((column) => column.name === "chestCode");
  const hasChestCodeRedeemedAtColumn = tableInfo.some((column) => column.name === "chestCodeRedeemedAt");
  const indexList = await prisma.$queryRawUnsafe<IndexListRow[]>('PRAGMA index_list("GameParticipant")');
  const hasChestCodeIndex = indexList.some((index) => index.name === "GameParticipant_chestCode_key");

  let backupPath: string | null = null;

  if (!hasChestCodeColumn) {
    backupPath = await backupDatabaseFile();
    console.log(`Backed up prisma/dev.db to ${backupPath}`);
    await prisma.$executeRawUnsafe('ALTER TABLE "GameParticipant" ADD COLUMN "chestCode" TEXT');
    console.log('Added nullable GameParticipant.chestCode column to prisma/dev.db.');
  }

  if (!hasChestCodeRedeemedAtColumn) {
    if (!backupPath) {
      backupPath = await backupDatabaseFile();
      console.log(`Backed up prisma/dev.db to ${backupPath}`);
    }
    await prisma.$executeRawUnsafe('ALTER TABLE "GameParticipant" ADD COLUMN "chestCodeRedeemedAt" DATETIME');
    console.log('Added nullable GameParticipant.chestCodeRedeemedAt column to prisma/dev.db.');
  }

  if (!hasChestCodeIndex) {
    if (!backupPath) {
      backupPath = await backupDatabaseFile();
      console.log(`Backed up prisma/dev.db to ${backupPath}`);
    }
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "GameParticipant_chestCode_key" ON "GameParticipant"("chestCode")',
    );
    console.log("Added unique index GameParticipant_chestCode_key.");
  }

  const approvedDmManagedParticipants = await prisma.$queryRawUnsafe<ParticipantBackfillRow[]>(`
    SELECT gp.id
    FROM "GameParticipant" gp
    INNER JOIN "Game" g ON g.id = gp.gameId
    WHERE gp.logStatus = 'APPROVED'
      AND gp.chestCode IS NULL
      AND g.status = 'COMPLETED'
  `);

  if (!approvedDmManagedParticipants.length) {
    console.log("No approved DM-managed game logs need chest-code backfill.");
    return;
  }

  if (!backupPath) {
    backupPath = await backupDatabaseFile();
    console.log(`Backed up prisma/dev.db to ${backupPath}`);
  }

  for (const participant of approvedDmManagedParticipants) {
    let assigned = false;

    for (let attempt = 0; attempt < 5 && !assigned; attempt++) {
      try {
        await prisma.gameParticipant.update({
          where: { id: participant.id },
          data: { chestCode: generateChestCode() },
        });
        assigned = true;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
      }
    }
  }

  console.log(`Backfilled ${approvedDmManagedParticipants.length} approved completed game chest code(s).`);
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
