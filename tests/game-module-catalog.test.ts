import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("catalog search supports either field and selected records stay unambiguous; new module details survive review submission", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "spellbook-game-catalog-"));
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
  writeFileSync(path.join(directory, "test.db"), "");
  let disconnect: (() => Promise<void>) | undefined;
  try {
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"], { env: process.env, stdio: "pipe" });
    const { prisma } = await import("../lib/prisma");
    disconnect = () => prisma.$disconnect();
    await prisma.adventureCatalog.createMany({ data: [
      { id: "catalog-one", adventureCode: "TEST-01", lookupCode: "test 01", title: "First adventure", lookupTitle: "first adventure", tier: "TIER_1" },
      { id: "catalog-two", adventureCode: "TEST-01", lookupCode: "test 01", title: "Second adventure", lookupTitle: "second adventure", tier: "TIER_2" },
    ] });
    const { GET: search } = await import("../app/api/adventure-catalog/search/route");
    const codeResults = await (await search(new Request("http://localhost/api/adventure-catalog/search?q=TEST-01"))).json();
    assert.equal(codeResults.matches.length, 2);
    const titleResults = await (await search(new Request("http://localhost/api/adventure-catalog/search?q=Second"))).json();
    assert.equal(titleResults.matches[0].id, "catalog-two");
    const { GET: lookup } = await import("../app/api/adventure-catalog/lookup/route");
    const selected = await (await lookup(new Request("http://localhost/api/adventure-catalog/lookup?catalogId=catalog-two"))).json();
    assert.equal(selected.match.title, "Second adventure");
    assert.equal(selected.match.tier, "TIER_2");
    await prisma.user.create({ data: { id: "reporter", name: "Test DM", email: "catalog-test@example.invalid", passwordHash: "unused" } });
    const { syncPendingAdventureModuleFromPlayerLog } = await import("../lib/pending-adventure-modules");
    await syncPendingAdventureModuleFromPlayerLog({
      adventureCode: "NEW-01", title: "New module", tier: "TIER_2", source: "https://example.invalid/adventure",
      duration: "4 hours", gameSummary: "The new module summary.", adventureImagePath: "/test-art.png",
      serviceHours: 4, downtimeDaysAwarded: 10, dmName: "Test DM", datePlayed: "2026-07-16T01:00:00.000Z",
      rewardsSummary: "100 gp", magicItemsAwarded: "", consumablesAwarded: "", spellbookAwarded: "", sessionNotes: "Story notes", reportedByUserId: "reporter",
    });
    const pending = await prisma.pendingAdventureModule.findFirstOrThrow({ where: { adventureCode: "NEW-01" } });
    assert.equal(pending.duration, "4 hours");
    assert.equal(pending.gameSummary, "The new module summary.");
    assert.equal(pending.adventureImagePath, "/test-art.png");
    assert.equal(pending.sourceSheet, "https://example.invalid/adventure");
    assert.equal(pending.downtimeDaysAwarded, 10);
    assert.equal(pending.serviceHours, 4);
    assert.equal(pending.reportedDatePlayed?.toISOString(), "2026-07-16T01:00:00.000Z");
    assert.equal(await prisma.adventureCatalog.count({ where: { adventureCode: "NEW-01" } }), 0);
  } finally {
    await disconnect?.();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});
