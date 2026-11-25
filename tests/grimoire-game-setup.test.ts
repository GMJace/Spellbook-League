import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { build } from "esbuild";

test("event submissions require a published event and its open slot, and retain catalog module details", async () => {
  const parent = path.resolve("tmp");
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, "grimoire-game-test-"));
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
  writeFileSync(path.join(directory, "test.db"), "");
  let disconnect: (() => Promise<void>) | undefined;
  try {
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"], { env: process.env, stdio: "pipe" });
    const { prisma } = await import("../lib/prisma");
    disconnect = () => prisma.$disconnect();
    const bundle = path.join(directory, "submission.cjs");
    await build({
      entryPoints: ["app/grimoire-gathering/dm/actions.ts"], outfile: bundle, bundle: true,
      platform: "node", format: "cjs", packages: "external",
      plugins: [{ name: "test-request-context", setup(bundler) {
        bundler.onResolve({ filter: /^(server-only|next\/cache|@\/auth)$/ }, (args) => ({ path: args.path, namespace: "test" }));
        bundler.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({ contents: args.path === "@/auth" ? "export async function auth(){ return null; }" : args.path === "next/cache" ? "export function revalidatePath(){}" : "", loader: "js" }));
      } }],
    });
    const { createGrimoireDmSubmission: submit } = createRequire(import.meta.url)(bundle);
    for (const id of ["published", "other", "past"]) {
      await prisma.grimoireEvent.create({ data: {
        id, label: id, subtitle: id, date: new Date(id === "past" ? "2001-07-15T00:00:00Z" : "2099-07-15T00:00:00Z"),
        displayDate: "July 15", theme: "", focus: "", ticketLabel: "", ticketPrice: "Free", ticketPriceUsd: 0,
      } });
    }
    await prisma.grimoireEventSlot.createMany({ data: [
      { id: "open", eventId: "published", slotKey: "open", label: "Open slot", startAt: new Date("2099-07-15T18:00:00Z"), endAt: new Date("2099-07-15T22:00:00Z"), gameSlotCount: 3 },
      { id: "full", eventId: "published", slotKey: "full", label: "Full slot", startAt: new Date("2099-07-16T18:00:00Z"), endAt: new Date("2099-07-16T22:00:00Z"), gameSlotCount: 0 },
      { id: "wrong-event", eventId: "other", slotKey: "other", label: "Other slot", startAt: new Date("2099-07-15T18:00:00Z"), endAt: new Date("2099-07-15T22:00:00Z"), gameSlotCount: 3 },
    ] });
    await prisma.adventureCatalog.create({ data: { id: "module", adventureCode: "CAT-01", lookupCode: "cat 01", title: "Catalog adventure", lookupTitle: "catalog adventure", tier: "TIER_2" } });
    const form = (overrides: Record<string, string> = {}) => {
      const result = new FormData();
      for (const [key, value] of Object.entries({ name: "Test DM", email: "dm@example.invalid", title: "Catalog adventure", gameCode: "CAT-01", tier: "TIER_2", seats: "6", eventId: "published", eventSlotId: "open", summary: "Adventure summary", catalogSelectionMode: "existing", catalogId: "module", ...overrides })) result.set(key, value);
      return result;
    };
    assert.match((await submit(form({ eventId: "unpublished" }))).error, /published Grimoire events/);
    assert.match((await submit(form({ eventId: "past" }))).error, /published Grimoire events/);
    assert.match((await submit(form({ eventSlotId: "wrong-event" }))).error, /listed event time slots/);
    assert.match((await submit(form({ eventSlotId: "full" }))).error, /already full/);
    assert.match((await submit(form({ seats: "9" }))).error, /required DM submission fields/);
    assert.match((await submit(form({ catalogId: "missing" }))).error, /active module/);
    assert.equal(await prisma.grimoireDmSubmission.count(), 0);
    assert.ok((await submit(form())).success);
    assert.ok((await submit(form({
      title: "New adventure", gameCode: "NEW-01", catalogSelectionMode: "new", catalogId: "",
      duration: "4 hours", source: "https://example.invalid/adventure", gameSummary: "Module summary", serviceHours: "4", downtimeDaysAwarded: "10",
    }))).success);
    const submissions = await prisma.grimoireDmSubmission.findMany();
    assert.equal(submissions.length, 2);
    assert.ok(submissions.every((submission) => submission.status === "PENDING" && submission.eventId === "published" && submission.slotStartAt.toISOString() === "2099-07-15T18:00:00.000Z"));
    const module = await prisma.pendingAdventureModule.findFirstOrThrow({ where: { adventureCode: "NEW-01" } });
    assert.equal(module.gameSummary, "Module summary");
    assert.equal(module.duration, "4 hours");
    assert.equal(module.downtimeDaysAwarded, 10);
  } finally {
    await disconnect?.();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    assert.equal(path.dirname(path.resolve(directory)), parent);
    rmSync(directory, { recursive: true, force: true });
  }
});
