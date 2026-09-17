import { readFile } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";

import { normalizeAdventureLookupValue } from "../lib/adventure-catalog";

const CATALOG_URL =
  "https://raw.githubusercontent.com/hoshisabi/al_adventure_catalog/main/assets/data/catalog.json";
const prisma = new PrismaClient();

type SourceAdventure = { i?: unknown; c?: unknown; n?: unknown; a?: unknown; t?: unknown; h?: unknown };
type CatalogEntry = { code: string; title: string; tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4"; author: string; hours: string; productId: string };

function key(code: string, title: string, tier: string) {
  return [normalizeAdventureLookupValue(code), normalizeAdventureLookupValue(title), tier].join("::");
}

async function readCatalog(path?: string) {
  if (path) return readFile(path, "utf8");
  const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Catalog download failed (${response.status}).`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > 20_000_000) throw new Error("Catalog is unexpectedly large.");
  const data = await response.text();
  if (data.length > 20_000_000) throw new Error("Catalog is unexpectedly large.");
  return data;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const includeNew = process.argv.includes("--include-new");
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
  const source = JSON.parse(await readCatalog(fileArg?.slice(7))) as {
    last_update?: unknown;
    adventures?: unknown;
  };
  if (!Array.isArray(source.adventures) || source.adventures.length < 100) {
    throw new Error("Catalog is missing its expected adventure list.");
  }

  const authorsByKey = new Map<string, Set<string>>();
  const catalogByKey = new Map<string, CatalogEntry>();
  const sourceCodeTierCounts = new Map<string, number>();
  for (const entry of source.adventures as SourceAdventure[]) {
    if (
      typeof entry.c !== "string" || !entry.c.trim() ||
      typeof entry.n !== "string" || !entry.n.trim() ||
      !Number.isInteger(entry.t) || Number(entry.t) < 1 || Number(entry.t) > 4 ||
      !Array.isArray(entry.a)
    ) continue;
    const authors = [...new Set(entry.a.filter((value): value is string => typeof value === "string")
      .map((value) => value.trim()).filter(Boolean))];
    if (!authors.length) continue;
    const entryKey = key(entry.c, entry.n, `TIER_${entry.t}`);
    const variants = authorsByKey.get(entryKey) ?? new Set<string>();
    variants.add(authors.join(", "));
    authorsByKey.set(entryKey, variants);
    const tier = `TIER_${entry.t}` as CatalogEntry["tier"];
    if (!catalogByKey.has(entryKey)) {
      catalogByKey.set(entryKey, {
        code: entry.c.trim(), title: entry.n.trim(), tier,
        author: authors.join(", "),
        hours: typeof entry.h === "string" ? entry.h.trim() : "",
        productId: typeof entry.i === "string" ? entry.i.trim() : "",
      });
      const codeTier = `${normalizeAdventureLookupValue(entry.c)}::${tier}`;
      sourceCodeTierCounts.set(codeTier, (sourceCodeTierCounts.get(codeTier) ?? 0) + 1);
    }
  }

  const modules = await prisma.adventureCatalog.findMany({
    select: { id: true, adventureCode: true, title: true, tier: true, author: true },
  });
  let matched = 0;
  let conflicts = 0;
  const updates: Array<{ id: string; author: string }> = [];
  const existingKeys = new Set(modules.map((module) => key(module.adventureCode, module.title, module.tier)));
  const existingCodeTiers = new Set(modules.map((module) => `${normalizeAdventureLookupValue(module.adventureCode)}::${module.tier}`));
  for (const module of modules) {
    const variants = authorsByKey.get(key(module.adventureCode, module.title, module.tier));
    if (!variants) continue;
    if (variants.size !== 1) { conflicts++; continue; }
    matched++;
    const author = [...variants][0];
    if (author !== module.author && !module.author.trim() && author.length <= 500) {
      updates.push({ id: module.id, author });
    }
  }
  const newModules = includeNew ? [...catalogByKey].filter(([entryKey, entry]) => {
    const codeTier = `${normalizeAdventureLookupValue(entry.code)}::${entry.tier}`;
    return !existingKeys.has(entryKey) && !existingCodeTiers.has(codeTier) &&
      sourceCodeTierCounts.get(codeTier) === 1 && authorsByKey.get(entryKey)?.size === 1 &&
      entry.code.length <= 80 && entry.title.length <= 160 && entry.author.length <= 500;
  }).map(([, entry]) => entry) : [];

  console.log(JSON.stringify({
    sourceUpdated: source.last_update,
    sourceEntries: source.adventures.length,
    localModules: modules.length,
    exactMatches: matched,
    authorConflicts: conflicts,
    emptyAuthorsToFill: updates.length,
    newMetadataOnlyModules: newModules.length,
    mode: apply ? "apply" : "dry-run",
  }, null, 2));
  if (!apply) return;
  for (const update of updates) {
    await prisma.adventureCatalog.updateMany({
      where: { id: update.id, author: "" },
      data: { author: update.author },
    });
  }
  for (const entry of newModules) {
    await prisma.adventureCatalog.create({
      data: {
        adventureCode: entry.code,
        lookupCode: normalizeAdventureLookupValue(entry.code),
        title: entry.title,
        lookupTitle: normalizeAdventureLookupValue(entry.title),
        tier: entry.tier,
        author: entry.author,
        duration: entry.hours ? `${entry.hours} hours` : "",
        sourceSheet: /^\d+$/.test(entry.productId) ? `https://www.dmsguild.com/product/${entry.productId}` : "",
        sourceNotes: "Metadata from AL Adventure Catalog. Rewards and AL legality have not been verified.",
      },
    });
  }
  console.log(`Updated ${updates.length} authors; added ${newModules.length} metadata-only modules.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
