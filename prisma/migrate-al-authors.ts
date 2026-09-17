import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const table of ["AdventureCatalog", "PendingAdventureModule"] as const) {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("${table}")`
    );
    if (!columns.some((column) => column.name === "author")) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN "author" TEXT NOT NULL DEFAULT ''`
      );
      console.log(`Added ${table}.author`);
    } else {
      console.log(`${table}.author already exists`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
