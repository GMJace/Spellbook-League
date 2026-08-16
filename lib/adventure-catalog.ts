import type { Tier } from "@prisma/client";

export type AdventureCatalogMagicItemBuckets = {
  commonMagicItems: string[];
  uncommonMagicItems: string[];
  rareMagicItems: string[];
  veryRareMagicItems: string[];
  legendaryMagicItems: string[];
  uniqueMagicItems: string[];
};

export type AdventureCatalogRecord = AdventureCatalogMagicItemBuckets & {
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
};

export type AdventureCatalogAutofillPayload = {
  adventureCode: string;
  title: string;
  tier: Tier;
  duration: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  sessionNotes: string;
};

export const ADVENTURE_CATALOG_TIER_OPTIONS: Array<{
  value: Tier;
  label: string;
}> = [
  { value: "TIER_1", label: "Tier 1" },
  { value: "TIER_2", label: "Tier 2" },
  { value: "TIER_3", label: "Tier 3" },
  { value: "TIER_4", label: "Tier 4" },
];

export function normalizeAdventureLookupValue(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function splitAdventureCatalogSpreadsheetValue(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n|;|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseAdventureCatalogListJson(value: string) {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function serializeAdventureCatalogList(values: string[] | string) {
  const normalizedValues = Array.isArray(values)
    ? values.map((value) => value.trim()).filter(Boolean)
    : splitAdventureCatalogSpreadsheetValue(values);

  return JSON.stringify(normalizedValues);
}

function toBulletLines(lines: string[]) {
  return lines.length ? lines.map((line) => `• ${line}`).join("\n") : "";
}

export function buildAdventureCatalogMagicItemLines(record: AdventureCatalogRecord) {
  return [
    ...record.commonMagicItems,
    ...record.uncommonMagicItems,
    ...record.rareMagicItems,
    ...record.veryRareMagicItems,
    ...record.legendaryMagicItems,
    ...record.uniqueMagicItems,
    ...(record.spellbook ? [`Spellbook: ${record.spellbook}`] : []),
  ];
}

export function buildAdventureCatalogAutofillPayload(
  record: AdventureCatalogRecord
): AdventureCatalogAutofillPayload {
  return {
    adventureCode: record.adventureCode,
    title: record.title,
    tier: record.tier,
    duration: record.duration,
    rewardsSummary: record.gold,
    magicItemsAwarded: toBulletLines(buildAdventureCatalogMagicItemLines(record)),
    consumablesAwarded: toBulletLines(record.consumables),
    sessionNotes: toBulletLines(splitAdventureCatalogSpreadsheetValue(record.storyAwards)),
  };
}
