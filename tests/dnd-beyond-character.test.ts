import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { importCharacterFromDndBeyondLink, parseDndBeyondCharacter, parseDndBeyondLink } from "../lib/dnd-beyond-character-import";
import { characterSyncFields, syncDndBeyondCharacter } from "../lib/dnd-beyond-character-sync";
import { isSameOriginRequest } from "../lib/request-origin";
import { deriveDndBeyondStats } from "../lib/dnd-beyond-derived-stats";

const link = "https://www.dndbeyond.com/characters/123456";
test("same-origin checks support HTTPS proxy requests and reject foreign or missing origins", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost:3000/api/sync", { method: "POST", headers });
  assert.equal(isSameOriginRequest(request({ origin: "http://localhost:3000" })), true);
  assert.equal(isSameOriginRequest(request({ origin: "https://www.spellbookrpg.games", host: "www.spellbookrpg.games", "x-forwarded-proto": "https" })), true);
  assert.equal(isSameOriginRequest(request({ origin: "https://www.spellbookrpg.games" }), "https://www.spellbookrpg.games"), true);
  assert.equal(isSameOriginRequest(request({ origin: "https://evil.example", host: "www.spellbookrpg.games", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" })), false);
  assert.equal(isSameOriginRequest(request({})), false);
  assert.equal(isSameOriginRequest(request({ origin: "null" })), false);
});
function fixture() {
  return { success: true, data: {
    id: 123456, name: "Test Wizard", baseHitPoints: 20,
    classes: [{ level: 5, definition: { name: "Wizard" }, subclassDefinition: { name: "Evoker" } }],
    feats: [{ definition: { name: "Alert" } }],
    modifiers: { class: [
      { type: "proficiency", friendlySubtypeName: "Perception" },
      { type: "expertise", friendlySubtypeName: "Perception" },
      { type: "proficiency", friendlySubtypeName: "Thieves' Tools" },
      { type: "language", friendlySubtypeName: "Common" },
    ] },
    inventory: [
      { id: 1, entityTypeId: 99, quantity: 1, definition: { name: "Backpack", isContainer: true } },
      { id: 2, entityTypeId: 99, quantity: 3, containerEntityId: 1, equipped: true, isAttuned: true, definition: { name: "Potion", isConsumable: true, rarity: "Common", weight: 0.5, description: "<p>Drink it</p>" } },
      { id: 3, entityTypeId: 99, quantity: 1, definition: { name: "Potion", armorClass: 19 } },
    ],
    customItems: [{ id: 1, name: "Keepsake", quantity: 0, description: "<img src=x onerror=alert(1)>A gift" }],
    characterValues: [{ typeId: 8, valueId: "2", valueTypeId: "99", value: "Healing draught" }, { typeId: 9, valueId: "2", valueTypeId: "99", value: "From an adventure" }],
    currencies: { gp: 100, sp: 2 },
    classSpells: [{ spells: [{ definition: { name: "Light", level: 0 } }] }],
  } };
}

test("complete inventory retains identity, containers, quantities, customizations and custom items", () => {
  const result = parseDndBeyondCharacter(fixture(), "123456");
  assert.equal(result.inventory.length, 4);
  assert.equal(new Set(result.inventory.map(item => item.id)).size, 4);
  assert.deepEqual(result.inventory[1], {
    id: "item:2", name: "Healing draught", originalName: "Potion", quantity: 3, equipped: true, attuned: true,
    containerId: "1", container: "Backpack", type: "Equipment", rarity: "Common", weight: 0.5,
    magic: false, consumable: true, custom: false, notes: "From an adventure", description: "Drink it",
  });
  assert.equal(result.inventory[3].quantity, 0);
  assert.equal(result.inventory[3].description, "A gift");
  assert.equal(JSON.parse(result.proficiencies!).Perception, "expertise");
  assert.deepEqual(JSON.parse(result.tools!), ["Thieves' Tools"]);
  assert.equal(result.spells[0].name, "Light");
});

test("partial combat values and currency cannot overwrite league fields", () => {
  const result = parseDndBeyondCharacter(fixture(), "123456");
  assert.equal(result.hitPoints, undefined);
  assert.equal(result.armorClass, undefined);
  assert.ok(result.warnings[0].includes("maximum HP"));
  const fields = characterSyncFields(result);
  for (const field of ["totalGold", "magicItems", "consumables", "notes", "backstory", "characterSheetLink"]) assert.ok(!(field in fields));
  const explicit = fixture();
  Object.assign(explicit.data, { overrideHitPoints: 0, armorClass: 17 });
  assert.equal(parseDndBeyondCharacter(explicit, "123456").hitPoints, 0);
  assert.equal(parseDndBeyondCharacter(explicit, "123456").armorClass, 17);
});

test("wrong characters, incomplete lists, malformed quantities and duplicate IDs are rejected", () => {
  assert.throws(() => parseDndBeyondCharacter(fixture(), "999999"));
  const partial = fixture();
  delete (partial.data as Partial<typeof partial.data>).inventory;
  assert.throws(() => parseDndBeyondCharacter(partial, "123456"), /incomplete/);
  const empty = fixture(); empty.data.inventory = []; empty.data.customItems = [];
  assert.equal(parseDndBeyondCharacter(empty, "123456").inventory.length, 0);
  const duplicate = fixture(); duplicate.data.inventory.push(duplicate.data.inventory[0]);
  assert.throws(() => parseDndBeyondCharacter(duplicate, "123456"), /duplicate/);
  const invalid = fixture(); invalid.data.inventory[0].quantity = -1;
  assert.throws(() => parseDndBeyondCharacter(invalid, "123456"), /quantity/);
});

test("untrusted URL hosts, credentials, ports and protocols are rejected", () => {
  for (const url of ["http://www.dndbeyond.com/characters/123456", "https://127.0.0.1/", "https://dndbeyond.com.evil.test/", "https://user:pass@www.dndbeyond.com/characters/123456", "https://www.dndbeyond.com:444/characters/123456", "file:///etc/passwd"]) assert.throws(() => parseDndBeyondLink(url));
  assert.equal(parseDndBeyondLink(link).hostname, "www.dndbeyond.com");
});

test("direct imports use the data endpoint; unsafe share redirects and private sheets fail", async () => {
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async input => { calls++; assert.equal(String(input), "https://character-service.dndbeyond.com/character/v5/character/123456"); return Response.json(fixture()); };
    assert.equal((await importCharacterFromDndBeyondLink(link)).inventory.length, 4);
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } });
    await assert.rejects(importCharacterFromDndBeyondLink("https://ddb.ac/characters/share"), /HTTPS/);
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await assert.rejects(importCharacterFromDndBeyondLink(link), /Public/);
    globalThis.fetch = async () => new Response(null, { status: 429 });
    await assert.rejects(importCharacterFromDndBeyondLink(link), /limiting/);
  } finally { globalThis.fetch = original; }
});

const directory = mkdtempSync(path.join(tmpdir(), "spellbook-ddb-test-"));
const databaseUrl = `file:${path.join(directory, "test.db").replace(/\\/g, "/")}`;
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
before(async () => {
  await db.$connect();
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" });
  await db.user.create({ data: { id: "sync-test-user", name: "Sync Test", email: "sync-test@example.invalid" } });
});
after(async () => { await db.$disconnect(); rmSync(directory, { recursive: true, force: true }); });

async function createCharacter() {
  return db.character.create({ data: {
    userId: "sync-test-user", name: "Original", class1Name: "Wizard", class1Level: 1, characterSheetLink: link,
    hitPoints: 40, armorClass: 15, totalGold: 50, notes: "Keep local notes", magicItems: '["League award"]',
  } });
}
const importer = async () => parseDndBeyondCharacter(fixture(), "123456");

test("sync saves exact inventory snapshots, removes absent items, preserves league data and throttles", async () => {
  const character = await createCharacter();
  assert.equal((await syncDndBeyondCharacter(db, character.id, importer)).status, "synced");
  let saved = (await db.character.findUniqueOrThrow({ where: { id: character.id } }));
  assert.equal(saved.name, "Test Wizard"); assert.equal(saved.class1Level, 5);
  assert.equal(saved.hitPoints, 40); assert.equal(saved.armorClass, 15); assert.equal(saved.totalGold, 50);
  assert.equal(saved.notes, "Keep local notes"); assert.equal(saved.magicItems, '["League award"]');
  assert.equal(JSON.parse(saved.dndBeyondData!).inventory.length, 4);
  assert.equal((await syncDndBeyondCharacter(db, character.id, async () => { throw new Error("Should not fetch"); })).status, "recent");
  await db.character.update({ where: { id: character.id }, data: { dndBeyondAttemptAt: null } });
  await syncDndBeyondCharacter(db, character.id, async () => { const next = fixture(); next.data.inventory = []; next.data.customItems = []; return parseDndBeyondCharacter(next, "123456"); });
  saved = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  assert.deepEqual(JSON.parse(saved.dndBeyondData!).inventory, []);
});

test("failed refresh preserves the last snapshot and timestamp; changed links do not display the old inventory", async () => {
  const character = await createCharacter();
  await syncDndBeyondCharacter(db, character.id, importer);
  const previous = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  await db.character.update({ where: { id: character.id }, data: { dndBeyondAttemptAt: null } });
  await syncDndBeyondCharacter(db, character.id, async () => { throw new Error("Private"); });
  let saved = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  assert.equal(saved.dndBeyondData, previous.dndBeyondData);
  assert.equal(saved.dndBeyondSyncedAt?.getTime(), previous.dndBeyondSyncedAt?.getTime());
  assert.equal(saved.dndBeyondError, "Private");
  await db.character.update({ where: { id: character.id }, data: { characterSheetLink: "https://www.dndbeyond.com/characters/999999" } });
  await syncDndBeyondCharacter(db, character.id, async () => { throw new Error("Private"); });
  saved = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  assert.equal(saved.dndBeyondData, null); assert.equal(saved.dndBeyondSyncedAt, null);
});

test("simultaneous requests fetch once and an edit made during fetch wins", async () => {
  const character = await createCharacter();
  let calls = 0;
  await Promise.all([1, 2, 3].map(() => syncDndBeyondCharacter(db, character.id, async () => { calls++; return importer(); })));
  assert.equal(calls, 1);
  await db.character.update({ where: { id: character.id }, data: { dndBeyondAttemptAt: null } });
  const outcome = await syncDndBeyondCharacter(db, character.id, async () => {
    await db.character.update({ where: { id: character.id }, data: { name: "My edit", updatedAt: new Date(Date.now() + 1000) } });
    return importer();
  });
  assert.equal(outcome.status, "changed");
  assert.equal((await db.character.findUniqueOrThrow({ where: { id: character.id } })).name, "My edit");
});

test("real supplied character fixture (when available locally)", { skip: !process.env.DDB_TEST_FIXTURE }, () => {
  const payload = JSON.parse(readFileSync(process.env.DDB_TEST_FIXTURE!, "utf8").replace(/^\uFEFF/, ""));
  const result = parseDndBeyondCharacter(payload, "157125295");
  assert.equal(result.name, "Lil Dragon");
  assert.equal(result.class1Name, "Wizard"); assert.equal(result.class1Level, 12);
  assert.equal(result.class2Name, "Rogue"); assert.equal(result.class2Level, 4);
  assert.equal(result.inventory.length, payload.data.inventory.length + payload.data.customItems.length);
  assert.ok(result.inventory.some(item => item.name === "Leafwarden"));
  // Independently checked against the public sheet, including active Bladesong,
  // Bracers of Defense, Staff of Power and the 2024 background ability scores.
  assert.equal(result.hitPoints, 134); assert.equal(result.currentHitPoints, 134);
  assert.equal(result.armorClass, 26); assert.equal(result.spellSaveDc, 18);
  assert.equal(result.passivePerception, 21); assert.equal(result.darkvisionFt, null);
  assert.equal(result.species, "Tortle"); assert.equal(result.background, "Mulhorandi Tomb Raider");
  assert.equal(result.currencies.gp, 43997);
  assert.equal(result.featNames?.length, payload.data.feats.length);
  assert.ok(result.languageNames?.some(name => name.replace(/’/g, "'") === "Thieves' Cant"));
  assert.deepEqual(result.customSkills, [{ name: "Vibe", rank: "Proficiency" }]);
  assert.deepEqual(result.warnings, []);
  console.log(`Verified Lil Dragon: ${result.inventory.length} inventory entries, ${result.spells.length} spells.`);
});

function combatFixture(): Record<string, any> {
  return {
    stats: [8, 14, 14, 18, 12, 10].map((value, index) => ({ id: index + 1, value })),
    bonusStats: [], overrideStats: [], baseHitPoints: 20, bonusHitPoints: 0,
    removedHitPoints: 7, temporaryHitPoints: 4,
    classes: [{ id: 10, level: 5, definition: { name: "Wizard", spellCastingAbilityId: 4 }, classFeatures: [] }],
    inventory: [], modifiers: { class: [{ type: "proficiency", subType: "perception" }] },
    customSenses: [], characterValues: [],
  };
}

test("derives HP, current HP, passive Perception, unarmored AC and class DC from components", () => {
  const result = deriveDndBeyondStats(combatFixture());
  assert.equal(result.hitPoints, 30); assert.equal(result.currentHitPoints, 23); assert.equal(result.temporaryHitPoints, 4);
  assert.equal(result.armorClass, 12); assert.equal(result.passivePerception, 14); assert.equal(result.spellSaveDc, 15);
  assert.deepEqual(result.warnings, []);
});

test("equipped magic armor, shields and attuned gear count once; inactive items and healing dice do not", () => {
  const data = combatFixture();
  const bonus = (subType: string, value: number) => ({ type: "bonus", subType, value });
  data.inventory = [
    { equipped: true, definition: { name: "Plate +1", filterType: "Armor", armorTypeId: 3, armorClass: 18, grantedModifiers: [bonus("armor-class", 1)] } },
    { equipped: true, definition: { name: "Shield +1", filterType: "Armor", armorTypeId: 4, armorClass: 2, grantedModifiers: [bonus("armor-class", 1)] } },
    { equipped: true, isAttuned: true, definition: { canAttune: true, grantedModifiers: [bonus("armor-class", 1)] } },
    { equipped: true, isAttuned: false, definition: { canAttune: true, grantedModifiers: [bonus("armor-class", 99), bonus("hit-points-per-level", 99)] } },
    { equipped: false, definition: { grantedModifiers: [bonus("armor-class", 99)] } },
    { equipped: true, definition: { grantedModifiers: [{ type: "bonus", subType: "hit-points", dice: { diceString: "2d8+2" }, fixedValue: 2, value: null }] } },
  ];
  data.modifiers.item = [bonus("armor-class", 99)];
  data.modifiers.class.push(bonus("armored-armor-class", 1));
  const result = deriveDndBeyondStats(data);
  assert.equal(result.armorClass, 24); assert.equal(result.hitPoints, 30);
});

test("ability overrides, score-setting items and class-specific HP bonuses work with multiclassing", () => {
  const data = combatFixture();
  data.classes.push({ id: 11, level: 2, definition: { name: "Sorcerer", spellCastingAbilityId: 6 }, classFeatures: [{ definition: { id: 101, requiredLevel: 1 } }] });
  data.overrideStats = [{ id: 3, value: 20 }];
  data.inventory = [{ equipped: true, isAttuned: true, definition: { canAttune: true, grantedModifiers: [{ type: "set", subType: "intelligence-score", value: 19 }] } }];
  data.modifiers.class.push({ type: "bonus", subType: "hit-points-per-level", value: 1, componentId: 101 });
  data.modifiers.feat = [{ type: "bonus", subType: "hit-points-per-level", value: 2 }];
  const result = deriveDndBeyondStats(data);
  assert.equal(result.hitPoints, 20 + 7 * 5 + 2 + 7 * 2);
  assert.deepEqual(result.spellSaveDcs, [{ name: "Wizard", dc: 15 }, { name: "Sorcerer", dc: 11 }]);
  assert.equal(result.spellSaveDc, 15);
});

test("custom combat overrides take priority and unsupported conditional totals are preserved", () => {
  const data = combatFixture();
  data.characterValues = [{ typeId: 1, value: 22 }, { typeId: 26, valueId: "14", value: 4 }, { typeId: 24, valueId: "14", value: 2 }];
  data.overrideHitPoints = 45;
  assert.equal(deriveDndBeyondStats(data).hitPoints, 45);
  assert.equal(deriveDndBeyondStats(data).armorClass, 22);
  assert.equal(deriveDndBeyondStats(data).passivePerception, 19);
  data.characterValues = [];
  data.modifiers.class.push({ type: "bonus", subType: "armor-class", value: 4, restriction: "While a special homebrew power is active" });
  const result = deriveDndBeyondStats(data);
  assert.equal(result.armorClass, undefined);
  assert.ok(result.warnings.some(w => w.includes("AC")));
});

test("sense ranges include active bonuses and overrides, and removed senses clear on sync", async () => {
  const data = combatFixture();
  data.modifiers.race = [{ type: "set-base", subType: "darkvision", value: 60 }];
  data.modifiers.class.push({ type: "sense", subType: "darkvision", value: 30 });
  data.customSenses = [{ senseId: 1, distance: 10 }];
  assert.equal(deriveDndBeyondStats(data).darkvisionFt, 90);
  assert.equal(deriveDndBeyondStats(data).blindsightFt, 10);
  data.customSenses.push({ senseId: 2, distance: 120 });
  assert.equal(deriveDndBeyondStats(data).darkvisionFt, 120);
  const character = await createCharacter();
  await db.character.update({ where: { id: character.id }, data: { darkvisionFt: 90 } });
  const parsed = parseDndBeyondCharacter({ success: true, data: { ...fixture().data, ...combatFixture() } }, "123456");
  await syncDndBeyondCharacter(db, character.id, async () => parsed);
  const saved = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  assert.equal(saved.darkvisionFt, null); assert.equal(saved.hitPoints, 30); assert.equal(saved.armorClass, 12);
  assert.equal(saved.spellSaveDc, 15); assert.equal(saved.passivePerception, 14); assert.equal(saved.totalGold, 50);
});

test("Monk defense cannot stack with a shield and unchosen or future class options do not apply", () => {
  const data = combatFixture();
  data.classes = [{ level: 5, definition: { name: "Monk" }, classFeatures: [{ definition: { id: 1, requiredLevel: 1 } }, { definition: { id: 2, requiredLevel: 10 } }] }];
  data.modifiers.class = [{ componentId: 1, type: "set", subType: "unarmored-armor-class", statId: 5 }, { componentId: 2, type: "bonus", subType: "armor-class", value: 99 }, { componentId: 3, type: "bonus", subType: "armor-class", value: 99 }];
  data.options = { class: [{ componentId: 1, definition: { id: 3 } }] };
  data.choices = { class: [{ componentId: 1, optionValue: 4 }] };
  assert.equal(deriveDndBeyondStats(data).armorClass, 13);
  data.inventory = [{ equipped: true, definition: { filterType: "Armor", armorTypeId: 4, armorClass: 2 } }];
  assert.equal(deriveDndBeyondStats(data).armorClass, 14);
  assert.equal(deriveDndBeyondStats(data).spellSaveDc, null);
});
