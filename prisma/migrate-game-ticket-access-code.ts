import { copyFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableInfoRow = {
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
  const tableInfo = await prisma.$queryRawUnsafe<TableInfoRow[]>('PRAGMA table_info("Game")');

  if (tableInfo.some((column) => column.name === "ticketAccessCodeHash")) {
    console.log("Game.ticketAccessCodeHash already exists. No migration needed.");
    return;
  }

  const backupPath = await backupDatabaseFile();
  console.log(`Backed up prisma/dev.db to ${backupPath}`);

  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Game" ADD COLUMN "ticketAccessCodeHash" TEXT',
  );

  console.log('Added nullable Game.ticketAccessCodeHash column to prisma/dev.db.');
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
