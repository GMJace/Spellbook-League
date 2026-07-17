import {
  DND_CLASSES,
  DndClassName,
  getDefaultLegalSubclassOptions,
  normalizeLeagueChoiceValues,
  type LegalSubclassOptionsMap,
} from "@/lib/character-options";
import { DND_FEATS, DND_LANGUAGES, DND_TOOLS } from "@/lib/character";
import { DEFAULT_LEGAL_CONSUMABLE_OPTIONS } from "@/lib/legal-consumable-options";
import { DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS } from "@/lib/legal-magic-item-options";
import { prisma } from "@/lib/prisma";

const LEGAL_SUBCLASS_CATEGORY = "LEGAL_SUBCLASSES";
const LEGAL_MAGIC_ITEMS_CATEGORY = "LEGAL_MAGIC_ITEMS";
const LEGAL_CONSUMABLES_CATEGORY = "LEGAL_CONSUMABLES";
const LEGAL_FEATS_CATEGORY = "LEGAL_FEATS";
const LEGAL_TOOLS_CATEGORY = "LEGAL_TOOLS";
const LEGAL_LANGUAGES_CATEGORY = "LEGAL_LANGUAGES";
const LEGAL_BOONS_CATEGORY = "LEGAL_BOONS";
const LEGAL_BLESSINGS_CATEGORY = "LEGAL_BLESSINGS";
const LEGAL_CHARMS_CATEGORY = "LEGAL_CHARMS";
const LEGAL_SHARED_KEY = "ALL";

export const MAGIC_ITEM_RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Unique / Artifacts",
] as const;

const BUILD_MAGIC_ITEM_RARITIES = [
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Unique / Artifacts",
] as const;

export type MagicItemRarity = (typeof MAGIC_ITEM_RARITIES)[number];
export type LegalMagicItemOptionsMap = Record<MagicItemRarity, string[]>;
export type LegalConsumableOptions = string[];
export type LegalFeatOptions = string[];
export type LegalToolOptions = string[];
export type LegalLanguageOptions = string[];
export type LegalBoonOptions = string[];
export type LegalBlessingOptions = string[];
export type LegalCharmOptions = string[];

type SharedLegalChoicesDefinition<TOptions extends string[]> = {
  category: string;
  label: string;
  getDefaults: () => TOptions;
};

function parseValuesJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? normalizeLeagueChoiceValues(parsed.filter((entry): entry is string => typeof entry === "string"))
      : [];
  } catch {
    return [];
  }
}

async function getSharedLegalChoiceOptions<TOptions extends string[]>(
  definition: SharedLegalChoicesDefinition<TOptions>
): Promise<TOptions> {
  const rows = await prisma.leagueLegalChoiceList.findMany({
    where: {
      category: definition.category,
    },
  });

  if (!rows.length) {
    return definition.getDefaults();
  }

  const sharedRow = rows.find((row) => row.key === LEGAL_SHARED_KEY);

  return (sharedRow
    ? parseValuesJson(sharedRow.valuesJson)
    : definition.getDefaults()) as TOptions;
}

async function updateSharedLegalChoiceOptions<TOptions extends string[]>(
  definition: SharedLegalChoicesDefinition<TOptions>,
  nextOptions: TOptions
) {
  await prisma.$transaction([
    prisma.leagueLegalChoiceList.upsert({
      where: {
        category_key: {
          category: definition.category,
          key: LEGAL_SHARED_KEY,
        },
      },
      create: {
        category: definition.category,
        key: LEGAL_SHARED_KEY,
        label: definition.label,
        valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions)),
      },
      update: {
        label: definition.label,
        valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions)),
      },
    }),
    prisma.leagueLegalChoiceList.deleteMany({
      where: {
        category: definition.category,
        key: {
          not: LEGAL_SHARED_KEY,
        },
      },
    }),
  ]);
}

const LEGAL_FEATS_DEFINITION: SharedLegalChoicesDefinition<LegalFeatOptions> = {
  category: LEGAL_FEATS_CATEGORY,
  label: "All feats",
  getDefaults: () => [...DND_FEATS],
};

const LEGAL_TOOLS_DEFINITION: SharedLegalChoicesDefinition<LegalToolOptions> = {
  category: LEGAL_TOOLS_CATEGORY,
  label: "All tools",
  getDefaults: () => DND_TOOLS.map((tool) => tool.name),
};

const LEGAL_LANGUAGES_DEFINITION: SharedLegalChoicesDefinition<LegalLanguageOptions> = {
  category: LEGAL_LANGUAGES_CATEGORY,
  label: "All languages",
  getDefaults: () => [...DND_LANGUAGES],
};

const LEGAL_BOONS_DEFINITION: SharedLegalChoicesDefinition<LegalBoonOptions> = {
  category: LEGAL_BOONS_CATEGORY,
  label: "All boons",
  getDefaults: () => [],
};

const LEGAL_BLESSINGS_DEFINITION: SharedLegalChoicesDefinition<LegalBlessingOptions> = {
  category: LEGAL_BLESSINGS_CATEGORY,
  label: "All blessings",
  getDefaults: () => [],
};

const LEGAL_CHARMS_DEFINITION: SharedLegalChoicesDefinition<LegalCharmOptions> = {
  category: LEGAL_CHARMS_CATEGORY,
  label: "All charms",
  getDefaults: () => [
    "Charm of Feather Falling",
    "Charm of Heroism",
    "Charm of Nine Lives",
    "Charm of Restoration",
    "Charm of the Crystal Heart",
    "Charm of the Maimed",
    "Charm of the Sage",
    "Charm of the Swollen Hag",
    "Charm of Treasure Sense",
    "Charm: Seasoul Touched",
    "Charm: Way of the Dragon",
  ],
};

export async function getLeagueLegalSubclassOptions(): Promise<LegalSubclassOptionsMap> {
  const rows = await prisma.leagueLegalChoiceList.findMany({
    where: {
      category: LEGAL_SUBCLASS_CATEGORY,
    },
  });

  const defaults = getDefaultLegalSubclassOptions();

  for (const row of rows) {
    if (row.key in defaults) {
      defaults[row.key as DndClassName] = parseValuesJson(row.valuesJson);
    }
  }

  return defaults;
}

export async function updateLeagueLegalSubclassOptions(
  nextOptions: LegalSubclassOptionsMap
) {
  await prisma.$transaction(
    DND_CLASSES.map((className) =>
      prisma.leagueLegalChoiceList.upsert({
        where: {
          category_key: {
            category: LEGAL_SUBCLASS_CATEGORY,
            key: className,
          },
        },
        create: {
          category: LEGAL_SUBCLASS_CATEGORY,
          key: className,
          label: className,
          valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions[className] ?? [])),
        },
        update: {
          label: className,
          valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions[className] ?? [])),
        },
      })
    )
  );
}

export function getDefaultLegalMagicItemOptions(): LegalMagicItemOptionsMap {
  return {
    Common: [...DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS.Common],
    Uncommon: [...DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS.Uncommon],
    Rare: [...DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS.Rare],
    "Very Rare": [...DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS["Very Rare"]],
    Legendary: [...DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS.Legendary],
    "Unique / Artifacts": [...DEFAULT_LEGAL_MAGIC_ITEM_OPTIONS["Unique / Artifacts"]],
  };
}

export function getDefaultLegalConsumableOptions(): LegalConsumableOptions {
  return [...DEFAULT_LEGAL_CONSUMABLE_OPTIONS];
}

export function getDefaultLegalFeatOptions(): LegalFeatOptions {
  return LEGAL_FEATS_DEFINITION.getDefaults();
}

export function getDefaultLegalToolOptions(): LegalToolOptions {
  return LEGAL_TOOLS_DEFINITION.getDefaults();
}

export function getDefaultLegalLanguageOptions(): LegalLanguageOptions {
  return LEGAL_LANGUAGES_DEFINITION.getDefaults();
}

export function getDefaultLegalBoonOptions(): LegalBoonOptions {
  return LEGAL_BOONS_DEFINITION.getDefaults();
}

export function getDefaultLegalBlessingOptions(): LegalBlessingOptions {
  return LEGAL_BLESSINGS_DEFINITION.getDefaults();
}

export function getDefaultLegalCharmOptions(): LegalCharmOptions {
  return LEGAL_CHARMS_DEFINITION.getDefaults();
}

export async function getLeagueLegalMagicItemOptions(): Promise<LegalMagicItemOptionsMap> {
  const rows = await prisma.leagueLegalChoiceList.findMany({
    where: {
      category: LEGAL_MAGIC_ITEMS_CATEGORY,
    },
  });

  const defaults = getDefaultLegalMagicItemOptions();

  for (const row of rows) {
    if (row.key in defaults) {
      defaults[row.key as MagicItemRarity] = parseValuesJson(row.valuesJson);
    }
  }

  return defaults;
}

export function getCharacterBuildMagicItemOptions(
  legalMagicItemOptions: LegalMagicItemOptionsMap
) {
  return normalizeLeagueChoiceValues(
    BUILD_MAGIC_ITEM_RARITIES.flatMap((rarity) => legalMagicItemOptions[rarity] ?? [])
  );
}

export async function updateLeagueLegalMagicItemOptions(
  nextOptions: LegalMagicItemOptionsMap
) {
  await prisma.$transaction(
    MAGIC_ITEM_RARITIES.map((rarity) =>
      prisma.leagueLegalChoiceList.upsert({
        where: {
          category_key: {
            category: LEGAL_MAGIC_ITEMS_CATEGORY,
            key: rarity,
          },
        },
        create: {
          category: LEGAL_MAGIC_ITEMS_CATEGORY,
          key: rarity,
          label: rarity,
          valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions[rarity] ?? [])),
        },
        update: {
          label: rarity,
          valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions[rarity] ?? [])),
        },
      })
    )
  );
}

export async function getLeagueLegalConsumableOptions(): Promise<LegalConsumableOptions> {
  const rows = await prisma.leagueLegalChoiceList.findMany({
    where: {
      category: LEGAL_CONSUMABLES_CATEGORY,
    },
  });

  if (!rows.length) {
    return getDefaultLegalConsumableOptions();
  }

  const sharedRow = rows.find((row) => row.key === LEGAL_SHARED_KEY);
  if (sharedRow) {
    return parseValuesJson(sharedRow.valuesJson);
  }

  const rowsByKey = new Map(rows.map((row) => [row.key, row.valuesJson]));

  return normalizeLeagueChoiceValues(
    MAGIC_ITEM_RARITIES.flatMap((rarity) => parseValuesJson(rowsByKey.get(rarity) ?? "[]"))
  );
}

export async function updateLeagueLegalConsumableOptions(
  nextOptions: LegalConsumableOptions
) {
  await prisma.$transaction(
    [
      prisma.leagueLegalChoiceList.upsert({
        where: {
          category_key: {
            category: LEGAL_CONSUMABLES_CATEGORY,
            key: LEGAL_SHARED_KEY,
          },
        },
        create: {
          category: LEGAL_CONSUMABLES_CATEGORY,
          key: LEGAL_SHARED_KEY,
          label: "All consumables",
          valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions)),
        },
        update: {
          label: "All consumables",
          valuesJson: JSON.stringify(normalizeLeagueChoiceValues(nextOptions)),
        },
      }),
      prisma.leagueLegalChoiceList.deleteMany({
        where: {
          category: LEGAL_CONSUMABLES_CATEGORY,
          key: {
            not: LEGAL_SHARED_KEY,
          },
        },
      }),
    ]
  );
}

export async function getLeagueLegalFeatOptions(): Promise<LegalFeatOptions> {
  return getSharedLegalChoiceOptions(LEGAL_FEATS_DEFINITION);
}

export async function updateLeagueLegalFeatOptions(nextOptions: LegalFeatOptions) {
  await updateSharedLegalChoiceOptions(LEGAL_FEATS_DEFINITION, nextOptions);
}

export async function getLeagueLegalToolOptions(): Promise<LegalToolOptions> {
  return getSharedLegalChoiceOptions(LEGAL_TOOLS_DEFINITION);
}

export async function updateLeagueLegalToolOptions(nextOptions: LegalToolOptions) {
  await updateSharedLegalChoiceOptions(LEGAL_TOOLS_DEFINITION, nextOptions);
}

export async function getLeagueLegalLanguageOptions(): Promise<LegalLanguageOptions> {
  return getSharedLegalChoiceOptions(LEGAL_LANGUAGES_DEFINITION);
}

export async function updateLeagueLegalLanguageOptions(
  nextOptions: LegalLanguageOptions
) {
  await updateSharedLegalChoiceOptions(LEGAL_LANGUAGES_DEFINITION, nextOptions);
}

export async function getLeagueLegalBoonOptions(): Promise<LegalBoonOptions> {
  return getSharedLegalChoiceOptions(LEGAL_BOONS_DEFINITION);
}

export async function updateLeagueLegalBoonOptions(nextOptions: LegalBoonOptions) {
  await updateSharedLegalChoiceOptions(LEGAL_BOONS_DEFINITION, nextOptions);
}

export async function getLeagueLegalBlessingOptions(): Promise<LegalBlessingOptions> {
  return getSharedLegalChoiceOptions(LEGAL_BLESSINGS_DEFINITION);
}

export async function updateLeagueLegalBlessingOptions(
  nextOptions: LegalBlessingOptions
) {
  await updateSharedLegalChoiceOptions(LEGAL_BLESSINGS_DEFINITION, nextOptions);
}

export async function getLeagueLegalCharmOptions(): Promise<LegalCharmOptions> {
  return getSharedLegalChoiceOptions(LEGAL_CHARMS_DEFINITION);
}

export async function updateLeagueLegalCharmOptions(nextOptions: LegalCharmOptions) {
  await updateSharedLegalChoiceOptions(LEGAL_CHARMS_DEFINITION, nextOptions);
}
