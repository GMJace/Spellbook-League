import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { PrismaClient, type Tier } from "@prisma/client";

import {
  normalizeAdventureLookupValue,
  serializeAdventureCatalogList,
} from "@/lib/adventure-catalog";

type ImportedAdventureRow = {
  adventureCode: string;
  title: string;
  tier: Tier;
  duration: string;
  gold: string;
  spellbook: string;
  storyAwards: string;
  pageNumbers: string;
  sourceSheet: string;
  sourceNotes: string;
  consumables: string[];
  commonMagicItems: string[];
  uncommonMagicItems: string[];
  rareMagicItems: string[];
  veryRareMagicItems: string[];
  legendaryMagicItems: string[];
  uniqueMagicItems: string[];
};

const prisma = new PrismaClient();

function mergeUniqueValues(values: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}

function mergePipeSeparatedValues(values: string[]) {
  return mergeUniqueValues(
    values.flatMap((value) =>
      value
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).join(" | ");
}

function mergeAdventureRows(rows: ImportedAdventureRow[]) {
  const merged = new Map<string, ImportedAdventureRow>();

  for (const row of rows) {
    const key = [
      normalizeAdventureLookupValue(row.adventureCode),
      normalizeAdventureLookupValue(row.title),
      row.tier,
    ].join("::");

    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...row,
        consumables: mergeUniqueValues(row.consumables),
        commonMagicItems: mergeUniqueValues(row.commonMagicItems),
        uncommonMagicItems: mergeUniqueValues(row.uncommonMagicItems),
        rareMagicItems: mergeUniqueValues(row.rareMagicItems),
        veryRareMagicItems: mergeUniqueValues(row.veryRareMagicItems),
        legendaryMagicItems: mergeUniqueValues(row.legendaryMagicItems),
        uniqueMagicItems: mergeUniqueValues(row.uniqueMagicItems),
      });
      continue;
    }

    existing.duration = existing.duration.trim() || row.duration.trim();
    existing.gold = mergePipeSeparatedValues([existing.gold, row.gold]);
    existing.spellbook = mergePipeSeparatedValues([existing.spellbook, row.spellbook]);
    existing.storyAwards = mergePipeSeparatedValues([existing.storyAwards, row.storyAwards]);
    existing.pageNumbers = mergePipeSeparatedValues([existing.pageNumbers, row.pageNumbers]);
    existing.sourceSheet = mergeUniqueValues(
      [existing.sourceSheet, row.sourceSheet]
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ).join(", ");
    existing.sourceNotes = mergePipeSeparatedValues([existing.sourceNotes, row.sourceNotes]);
    existing.consumables = mergeUniqueValues([...existing.consumables, ...row.consumables]);
    existing.commonMagicItems = mergeUniqueValues([
      ...existing.commonMagicItems,
      ...row.commonMagicItems,
    ]);
    existing.uncommonMagicItems = mergeUniqueValues([
      ...existing.uncommonMagicItems,
      ...row.uncommonMagicItems,
    ]);
    existing.rareMagicItems = mergeUniqueValues([...existing.rareMagicItems, ...row.rareMagicItems]);
    existing.veryRareMagicItems = mergeUniqueValues([
      ...existing.veryRareMagicItems,
      ...row.veryRareMagicItems,
    ]);
    existing.legendaryMagicItems = mergeUniqueValues([
      ...existing.legendaryMagicItems,
      ...row.legendaryMagicItems,
    ]);
    existing.uniqueMagicItems = mergeUniqueValues([
      ...existing.uniqueMagicItems,
      ...row.uniqueMagicItems,
    ]);
  }

  return [...merged.values()];
}

function getFilePathFromArgs() {
  const pathArg = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith("--"));

  if (!pathArg) {
    throw new Error("Provide the spreadsheet path: npm run db:import:adventures -- <file>");
  }

  return resolve(pathArg);
}

function runExtractor(filePath: string) {
  const helperPath = resolve("scripts", "extract-adventures-from-workbook.py");
  const pythonCandidates: Array<[string, string[]]> =
    process.env.ADVENTURE_IMPORT_PYTHON?.trim()
      ? [[process.env.ADVENTURE_IMPORT_PYTHON.trim(), [] as string[]]]
      : [];

  pythonCandidates.push(["python", []]);

  if (process.platform === "win32") {
    pythonCandidates.push(["py", ["-3"]]);
  }

  for (const [command, baseArgs] of pythonCandidates) {
    const result = spawnSync(command, [...baseArgs, helperPath, filePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.error) {
      continue;
    }

    if (result.status !== 0) {
      const stderr = result.stderr.trim();

      if (stderr.includes("No module named 'openpyxl'")) {
        throw new Error(
          "Python is available, but openpyxl is missing. Install it with `python -m pip install openpyxl`, or point ADVENTURE_IMPORT_PYTHON at a Python environment that already has openpyxl."
        );
      }

      throw new Error(stderr || "Adventure extractor failed.");
    }

    return result.stdout.trim();
  }

  throw new Error(
    "Python was not found. Set ADVENTURE_IMPORT_PYTHON to a Python executable with openpyxl installed."
  );
}

async function main() {
  const filePath = getFilePathFromArgs();
  const extractedJson = runExtractor(filePath);
  const rows = mergeAdventureRows(JSON.parse(extractedJson) as ImportedAdventureRow[]);
  let importedCount = 0;

  for (const row of rows) {
    const adventureCode = row.adventureCode.trim();
    const title = row.title.trim();
    const lookupCode = normalizeAdventureLookupValue(adventureCode);
    const lookupTitle = normalizeAdventureLookupValue(title);

    if (!adventureCode || !title || !lookupCode || !lookupTitle || !row.tier) {
      continue;
    }

    await prisma.adventureCatalog.upsert({
      where: {
        lookupCode_lookupTitle_tier: {
          lookupCode,
          lookupTitle,
          tier: row.tier,
        },
      },
      create: {
        adventureCode,
        lookupCode,
        title,
        lookupTitle,
        tier: row.tier,
        duration: row.duration.trim(),
        gold: row.gold.trim(),
        spellbook: row.spellbook.trim(),
        storyAwards: row.storyAwards.trim(),
        pageNumbers: row.pageNumbers.trim(),
        sourceSheet: row.sourceSheet.trim(),
        sourceNotes: row.sourceNotes.trim(),
        consumablesJson: serializeAdventureCatalogList(row.consumables),
        commonMagicItemsJson: serializeAdventureCatalogList(row.commonMagicItems),
        uncommonMagicItemsJson: serializeAdventureCatalogList(row.uncommonMagicItems),
        rareMagicItemsJson: serializeAdventureCatalogList(row.rareMagicItems),
        veryRareMagicItemsJson: serializeAdventureCatalogList(row.veryRareMagicItems),
        legendaryMagicItemsJson: serializeAdventureCatalogList(row.legendaryMagicItems),
        uniqueMagicItemsJson: serializeAdventureCatalogList(row.uniqueMagicItems),
      },
      update: {
        adventureCode,
        title,
        lookupTitle,
        tier: row.tier,
        duration: row.duration.trim(),
        gold: row.gold.trim(),
        spellbook: row.spellbook.trim(),
        storyAwards: row.storyAwards.trim(),
        pageNumbers: row.pageNumbers.trim(),
        sourceSheet: row.sourceSheet.trim(),
        sourceNotes: row.sourceNotes.trim(),
        consumablesJson: serializeAdventureCatalogList(row.consumables),
        commonMagicItemsJson: serializeAdventureCatalogList(row.commonMagicItems),
        uncommonMagicItemsJson: serializeAdventureCatalogList(row.uncommonMagicItems),
        rareMagicItemsJson: serializeAdventureCatalogList(row.rareMagicItems),
        veryRareMagicItemsJson: serializeAdventureCatalogList(row.veryRareMagicItems),
        legendaryMagicItemsJson: serializeAdventureCatalogList(row.legendaryMagicItems),
        uniqueMagicItemsJson: serializeAdventureCatalogList(row.uniqueMagicItems),
      },
    });

    importedCount += 1;
  }

  console.log(`Imported ${importedCount} adventures from ${filePath}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Adventure import failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
