import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { claimAccountWelcome } from "../lib/account-welcome";

const directory = mkdtempSync(path.join(tmpdir(), "spellbook-welcome-"));
const db = new PrismaClient({
  datasources: { db: { url: `file:${path.join(directory, "welcome.db").replace(/\\/g, "/")}` } },
});

before(async () => {
  await db.$executeRawUnsafe('CREATE TABLE "User" ("id" TEXT PRIMARY KEY)');
  await db.$executeRawUnsafe(`CREATE TABLE "AccountWelcome" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "shownAt" DATETIME,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
});

after(async () => {
  await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

async function account(id: string, isNew = true) {
  await db.$executeRaw`INSERT INTO "User" ("id") VALUES (${id})`;
  if (isNew) await db.accountWelcome.create({ data: { userId: id } });
}

test("a new account sees the welcome once across repeated logins", async () => {
  await account("new-player");
  assert.equal(await claimAccountWelcome(db, "new-player"), true);
  assert.equal(await claimAccountWelcome(db, "new-player"), false);
  const row = await db.accountWelcome.findUniqueOrThrow({ where: { userId: "new-player" } });
  assert.ok(row.shownAt instanceof Date);
});

test("existing accounts and unknown accounts do not receive a welcome", async () => {
  await account("existing", false);
  assert.equal(await claimAccountWelcome(db, "existing"), false);
  assert.equal(await claimAccountWelcome(db, "unknown"), false);
});

test("simultaneous tabs or devices can only claim one welcome", async () => {
  await account("two-tabs");
  const results = await Promise.all([
    claimAccountWelcome(db, "two-tabs"),
    claimAccountWelcome(db, "two-tabs"),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("welcoming one account does not consume another account's welcome", async () => {
  await account("player");
  await account("dm");
  assert.equal(await claimAccountWelcome(db, "player"), true);
  assert.equal(await claimAccountWelcome(db, "dm"), true);
});

test("deleting an account also removes its welcome state", async () => {
  await account("deleted");
  await db.$executeRaw`DELETE FROM "User" WHERE "id" = ${"deleted"}`;
  assert.equal(await db.accountWelcome.findUnique({ where: { userId: "deleted" } }), null);
});
