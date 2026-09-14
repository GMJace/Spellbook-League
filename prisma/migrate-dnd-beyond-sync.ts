import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
async function main() {
  const columns = await db.$queryRawUnsafe<{ name: string }[]>('PRAGMA table_info("Character")');
  if (!columns.length) throw new Error("Character table not found. Run this only against the existing SQLite app database.");
  const additions = [
    ["dndBeyondData", "TEXT"], ["dndBeyondSyncedAt", "DATETIME"], ["dndBeyondAttemptAt", "DATETIME"],
    ["dndBeyondSyncLink", "TEXT"], ["dndBeyondError", "TEXT"],
  ].filter(([name]) => !columns.some(column => column.name === name));
  if (!additions.length) { console.log("D&D Beyond sync columns already exist."); return; }
  const files = await db.$queryRawUnsafe<{ name: string; file: string }[]>("PRAGMA database_list");
  const file = files.find(entry => entry.name === "main")?.file;
  if (!file) throw new Error("Cannot locate the database for backup.");
  const backup = `${file}.backup-ddb-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  // SQLite creates a consistent snapshot, including committed WAL data.
  await db.$executeRawUnsafe(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
  console.log(`Backup: ${backup}`);
  await db.$transaction(additions.map(([name, type]) => db.$executeRawUnsafe(`ALTER TABLE "Character" ADD COLUMN "${name}" ${type}`)));
  console.log(`Added ${additions.length} nullable sync columns. Existing character and league data preserved.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
