import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw<Array<{ name: string }>>`
    PRAGMA table_info("AdventureCatalog")
  `;
  if (!columns.some((column) => column.name === "isActive")) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "AdventureCatalog" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true'
    );
    console.log("Added AdventureCatalog.isActive");
  } else {
    console.log("AdventureCatalog.isActive already exists");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
