import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Existing accounts intentionally receive no row and never see the welcome.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AccountWelcome" (
      "userId" TEXT NOT NULL PRIMARY KEY,
      "shownAt" DATETIME,
      CONSTRAINT "AccountWelcome_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  console.log("Account welcome tracking is ready. Existing accounts are unchanged.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
