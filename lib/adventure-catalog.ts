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
  gameSummary: string;
  adventureImagePath: null | string;
  serviceHours: number;
  downtimeDaysAwarded: number;
  gold: string;
  spellbook: string;
  storyAwards: string;
  pageNumbers: string;
  sourceSheet: string;
  sourceNotes: string;
  consumables: string[];
  boons: string[];
  blessings: string[];
  charms: string[];
  additionalMagicRewardNotes: string;
  additionalConsumableNotes: string;
};

export type AdventureCatalogAutofillPayload = {
  adventureCode: string;
  title: string;
  tier: Tier;
  duration: string;
  source: string;
  gameSummary: string;
  adventureImagePath: null | string;
  serviceHours: string;
  downtimeDaysAwarded: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  spellbookAwarded: string;
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

export function splitAdventureCatalogTextareaValue(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((entry) => entry.replace(/^[-*•]\s*/, "").trim())
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
    source: record.sourceSheet,
    gameSummary: record.gameSummary,
    adventureImagePath: record.adventureImagePath,
    serviceHours: String(record.serviceHours || 0),
    downtimeDaysAwarded: String(record.downtimeDaysAwarded || 0),
    rewardsSummary: record.gold,
    magicItemsAwarded: toBulletLines([
      ...record.commonMagicItems,
      ...record.uncommonMagicItems,
      ...record.rareMagicItems,
      ...record.veryRareMagicItems,
      ...record.legendaryMagicItems,
      ...record.uniqueMagicItems,
      ...record.boons,
      ...record.blessings,
      ...record.charms,
      ...splitAdventureCatalogTextareaValue(record.additionalMagicRewardNotes),
    ]),
    consumablesAwarded: toBulletLines([
      ...record.consumables,
      ...splitAdventureCatalogTextareaValue(record.additionalConsumableNotes),
    ]),
    spellbookAwarded: record.spellbook,
    sessionNotes: toBulletLines(splitAdventureCatalogSpreadsheetValue(record.storyAwards)),
  };
}
