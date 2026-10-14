import { copyFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableColumnRow = {
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
  const columns = await prisma.$queryRawUnsafe<TableColumnRow[]>(
    'PRAGMA table_info("MagicItemCard")',
  );
  const columnNames = new Set(columns.map((column) => column.name));
  const missingEditionNumber = !columnNames.has("limitedEditionNumber");
  const missingEditionLimit = !columnNames.has("limitedEditionLimit");

  if (!missingEditionNumber && !missingEditionLimit) {
    console.log("Magic item card edition fields already exist. No migration needed.");
    return;
  }

  const backupPath = await backupDatabaseFile();
  console.log(`Backed up prisma/dev.db to ${backupPath}`);

  if (missingEditionNumber) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "MagicItemCard" ADD COLUMN "limitedEditionNumber" INTEGER',
    );
  }

  if (missingEditionLimit) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "MagicItemCard" ADD COLUMN "limitedEditionLimit" INTEGER',
    );
  }

  console.log("Added magic item card limited-edition fields.");
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
