import {
  DND_CLASSES,
  DndClassName,
  getDefaultLegalSubclassOptions,
  normalizeLeagueChoiceValues,
  type LegalSubclassOptionsMap,
} from "@/lib/character-options";
import {
  CLASS_GRANTED_LANGUAGE_GROUP_TITLE,
  DND_FEAT_GROUPS,
  DND_FEATS,
  DND_LANGUAGE_GROUPS,
  DND_LANGUAGES,
  DND_TOOLS,
  TOOL_GROUP_NOTES,
  type LegalFeatGroup,
  type LegalLanguageGroup,
  type LegalToolGroup,
  normalizeLegalFeatOptions,
} from "@/lib/character";
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
const LEGAL_MINOR_PROPERTIES_CATEGORY = "LEGAL_MINOR_PROPERTIES";
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
export type LegalMinorPropertyOptions = string[];
export type GroupedLeagueLegalChoiceSection = {
  key: string;
  title: string;
  note?: string;
  values: string[];
};

type SharedLegalChoicesDefinition<TOptions extends string[]> = {
  category: string;
  label: string;
  getDefaults: () => TOptions;
};

type GroupedLegalChoiceSectionDefinition<TOptions extends string[]> = {
  key: string;
  defaultTitle: string;
  note?: string;
  isCatchAll?: boolean;
  getDefaultValues: () => TOptions;
};

type GroupedLegalChoicesDefinition<TOptions extends string[]> = {
  category: string;
  sections: readonly GroupedLegalChoiceSectionDefinition<TOptions>[];
  normalizeValues?: (values: string[]) => TOptions;
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

function normalizeGroupedLegalChoiceValues<TOptions extends string[]>(
  definition: GroupedLegalChoicesDefinition<TOptions>,
  values: string[]
) {
  const normalizedValues = normalizeLeagueChoiceValues(values);

  return definition.normalizeValues
    ? definition.normalizeValues(normalizedValues)
    : (normalizedValues as TOptions);
}

function getDefaultGroupedLegalChoiceSections<TOptions extends string[]>(
  definition: GroupedLegalChoicesDefinition<TOptions>
): GroupedLeagueLegalChoiceSection[] {
  return definition.sections.map((section) => ({
    key: section.key,
    title: section.defaultTitle,
    note: section.note,
    values: normalizeGroupedLegalChoiceValues(definition, section.getDefaultValues()),
  }));
}

function mapFlatLegalChoiceOptionsToGroupedSections<TOptions extends string[]>(
  definition: GroupedLegalChoicesDefinition<TOptions>,
  nextOptions: string[]
) {
  const remainingValues = new Set(
    normalizeGroupedLegalChoiceValues(definition, nextOptions)
  );

  return definition.sections.map((section) => {
    if (section.isCatchAll) {
      return {
        key: section.key,
        title: section.defaultTitle,
        note: section.note,
        values: normalizeGroupedLegalChoiceValues(definition, [...remainingValues]),
      };
    }

    const sectionValues = normalizeGroupedLegalChoiceValues(
      definition,
      section.getDefaultValues().filter((value) => remainingValues.has(value))
    );

    for (const value of sectionValues) {
      remainingValues.delete(value);
    }

    return {
      key: section.key,
      title: section.defaultTitle,
      note: section.note,
      values: sectionValues,
    };
  });
}

async function getGroupedLegalChoiceSections<TOptions extends string[]>(
  definition: GroupedLegalChoicesDefinition<TOptions>
): Promise<GroupedLeagueLegalChoiceSection[]> {
  const rows = await prisma.leagueLegalChoiceList.findMany({
    where: {
      category: definition.category,
    },
  });

  if (!rows.length) {
    return getDefaultGroupedLegalChoiceSections(definition);
  }

  const sharedRow = rows.find((row) => row.key === LEGAL_SHARED_KEY);
  if (sharedRow) {
    return mapFlatLegalChoiceOptionsToGroupedSections(
      definition,
      parseValuesJson(sharedRow.valuesJson)
    );
  }

  const rowsByKey = new Map(rows.map((row) => [row.key, row]));

  return definition.sections.map((section) => {
    const row = rowsByKey.get(section.key);

    return {
      key: section.key,
      title: row?.label.trim() ? row.label.trim() : section.defaultTitle,
      note: section.note,
      values: row
        ? normalizeGroupedLegalChoiceValues(definition, parseValuesJson(row.valuesJson))
        : normalizeGroupedLegalChoiceValues(definition, section.getDefaultValues()),
    };
  });
}

async function updateGroupedLegalChoiceSections<TOptions extends string[]>(
  definition: GroupedLegalChoicesDefinition<TOptions>,
  nextSections: GroupedLeagueLegalChoiceSection[]
) {
  const nextSectionsByKey = new Map(nextSections.map((section) => [section.key, section]));
  const allowedKeys = definition.sections.map((section) => section.key);

  await prisma.$transaction([
    ...definition.sections.map((section) => {
      const nextSection = nextSectionsByKey.get(section.key);
      const nextTitle = nextSection?.title.trim() || section.defaultTitle;
      const nextValues = normalizeGroupedLegalChoiceValues(
        definition,
        nextSection?.values ?? section.getDefaultValues()
      );

      return prisma.leagueLegalChoiceList.upsert({
        where: {
          category_key: {
            category: definition.category,
            key: section.key,
          },
        },
        create: {
          category: definition.category,
          key: section.key,
          label: nextTitle,
          valuesJson: JSON.stringify(nextValues),
        },
        update: {
          label: nextTitle,
          valuesJson: JSON.stringify(nextValues),
        },
      });
    }),
    prisma.leagueLegalChoiceList.deleteMany({
      where: {
        category: definition.category,
        key: {
          notIn: allowedKeys,
        },
      },
    }),
  ]);
}

function flattenGroupedLegalChoiceSections(sections: GroupedLeagueLegalChoiceSection[]) {
  return normalizeLeagueChoiceValues(
    sections.flatMap((section) => section.values)
  );
}

const LEGAL_FEATS_DEFINITION: SharedLegalChoicesDefinition<LegalFeatOptions> = {
  category: LEGAL_FEATS_CATEGORY,
  label: "All feats",
  getDefaults: () => normalizeLegalFeatOptions([...DND_FEATS]),
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

const LEGAL_MINOR_PROPERTIES_DEFINITION: SharedLegalChoicesDefinition<LegalMinorPropertyOptions> = {
  category: LEGAL_MINOR_PROPERTIES_CATEGORY,
  label: "All minor properties",
  getDefaults: () => [
    "Beacon",
    "Compass",
    "Delver",
    "Guardian",
    "Harmonious",
    "Key",
    "Secret Message",
    "Sentinel",
    "Songcraft",
    "Strange Material",
    "Temperate",
    "Unbreakable",
    "War Leader",
    "Waterborne",
  ],
};

const LEGAL_FEAT_SECTION_DEFINITIONS = [
  ...DND_FEAT_GROUPS.map(
    (group): GroupedLegalChoiceSectionDefinition<LegalFeatOptions> => ({
      key: group.title,
      defaultTitle: group.title,
      note: ("note" in group ? group.note : undefined) as string | undefined,
      getDefaultValues: () => normalizeLegalFeatOptions([...group.feats]),
    })
  ),
  {
    key: "Additional legal feats",
    defaultTitle: "Additional legal feats",
    isCatchAll: true,
    getDefaultValues: () => [],
  },
] as const satisfies readonly GroupedLegalChoiceSectionDefinition<LegalFeatOptions>[];

const LEGAL_TOOL_SECTION_DEFINITIONS = [
  ...Array.from(new Set(DND_TOOLS.map((tool) => tool.category))).map(
    (category): GroupedLegalChoiceSectionDefinition<LegalToolOptions> => ({
      key: category,
      defaultTitle: category,
      note: TOOL_GROUP_NOTES[category],
      getDefaultValues: () =>
        DND_TOOLS.filter((tool) => tool.category === category).map((tool) => tool.name),
    })
  ),
  {
    key: "Additional legal tools",
    defaultTitle: "Additional legal tools",
    isCatchAll: true,
    getDefaultValues: () => [],
  },
] as const satisfies readonly GroupedLegalChoiceSectionDefinition<LegalToolOptions>[];

const LEGAL_LANGUAGE_SECTION_DEFINITIONS = [
  ...DND_LANGUAGE_GROUPS.filter(
    (group) => group.title !== CLASS_GRANTED_LANGUAGE_GROUP_TITLE
  ).map(
    (group): GroupedLegalChoiceSectionDefinition<LegalLanguageOptions> => ({
      key: group.title,
      defaultTitle: group.title,
      note: ("note" in group ? group.note : undefined) as string | undefined,
      getDefaultValues: () => [...group.languages],
    })
  ),
  {
    key: "Additional legal languages",
    defaultTitle: "Additional legal languages",
    isCatchAll: true,
    getDefaultValues: () => [],
  },
] as const satisfies readonly GroupedLegalChoiceSectionDefinition<LegalLanguageOptions>[];

const LEGAL_FEAT_GROUPS_DEFINITION: GroupedLegalChoicesDefinition<LegalFeatOptions> = {
  category: LEGAL_FEATS_CATEGORY,
  sections: LEGAL_FEAT_SECTION_DEFINITIONS,
  normalizeValues: normalizeLegalFeatOptions,
};

const LEGAL_TOOL_GROUPS_DEFINITION: GroupedLegalChoicesDefinition<LegalToolOptions> = {
  category: LEGAL_TOOLS_CATEGORY,
  sections: LEGAL_TOOL_SECTION_DEFINITIONS,
};

const LEGAL_LANGUAGE_GROUPS_DEFINITION: GroupedLegalChoicesDefinition<LegalLanguageOptions> = {
  category: LEGAL_LANGUAGES_CATEGORY,
  sections: LEGAL_LANGUAGE_SECTION_DEFINITIONS,
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

export function getDefaultLegalMinorPropertyOptions(): LegalMinorPropertyOptions {
  return LEGAL_MINOR_PROPERTIES_DEFINITION.getDefaults();
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
  return normalizeLegalFeatOptions(
    flattenGroupedLegalChoiceSections(await getLeagueLegalFeatSections())
  );
}

export async function updateLeagueLegalFeatOptions(nextOptions: LegalFeatOptions) {
  await updateLeagueLegalFeatSections(
    mapFlatLegalChoiceOptionsToGroupedSections(
      LEGAL_FEAT_GROUPS_DEFINITION,
      normalizeLegalFeatOptions(nextOptions)
    )
  );
}

export async function getLeagueLegalToolOptions(): Promise<LegalToolOptions> {
  return flattenGroupedLegalChoiceSections(await getLeagueLegalToolSections());
}

export async function updateLeagueLegalToolOptions(nextOptions: LegalToolOptions) {
  await updateLeagueLegalToolSections(
    mapFlatLegalChoiceOptionsToGroupedSections(LEGAL_TOOL_GROUPS_DEFINITION, nextOptions)
  );
}

export async function getLeagueLegalLanguageOptions(): Promise<LegalLanguageOptions> {
  return flattenGroupedLegalChoiceSections(await getLeagueLegalLanguageSections());
}

export async function updateLeagueLegalLanguageOptions(
  nextOptions: LegalLanguageOptions
) {
  await updateLeagueLegalLanguageSections(
    mapFlatLegalChoiceOptionsToGroupedSections(
      LEGAL_LANGUAGE_GROUPS_DEFINITION,
      nextOptions
    )
  );
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

export async function getLeagueLegalMinorPropertyOptions(): Promise<LegalMinorPropertyOptions> {
  return getSharedLegalChoiceOptions(LEGAL_MINOR_PROPERTIES_DEFINITION);
}

export async function updateLeagueLegalMinorPropertyOptions(
  nextOptions: LegalMinorPropertyOptions
) {
  await updateSharedLegalChoiceOptions(LEGAL_MINOR_PROPERTIES_DEFINITION, nextOptions);
}

export async function getLeagueLegalFeatSections() {
  return getGroupedLegalChoiceSections(LEGAL_FEAT_GROUPS_DEFINITION);
}

export async function updateLeagueLegalFeatSections(
  nextSections: GroupedLeagueLegalChoiceSection[]
) {
  await updateGroupedLegalChoiceSections(LEGAL_FEAT_GROUPS_DEFINITION, nextSections);
}

export async function getLeagueLegalToolSections() {
  return getGroupedLegalChoiceSections(LEGAL_TOOL_GROUPS_DEFINITION);
}

export async function updateLeagueLegalToolSections(
  nextSections: GroupedLeagueLegalChoiceSection[]
) {
  await updateGroupedLegalChoiceSections(LEGAL_TOOL_GROUPS_DEFINITION, nextSections);
}

export async function getLeagueLegalLanguageSections() {
  return getGroupedLegalChoiceSections(LEGAL_LANGUAGE_GROUPS_DEFINITION);
}

export async function updateLeagueLegalLanguageSections(
  nextSections: GroupedLeagueLegalChoiceSection[]
) {
  await updateGroupedLegalChoiceSections(LEGAL_LANGUAGE_GROUPS_DEFINITION, nextSections);
}

export async function getLeagueLegalFeatGroups(): Promise<LegalFeatGroup[]> {
  return (await getLeagueLegalFeatSections()).map((section) => ({
    title: section.title,
    note: section.note,
    feats: section.values,
  }));
}

export async function getLeagueLegalToolGroups(): Promise<LegalToolGroup[]> {
  return (await getLeagueLegalToolSections()).map((section) => ({
    title: section.title,
    note: section.note,
    tools: section.values,
  }));
}

export async function getLeagueLegalLanguageGroups(): Promise<LegalLanguageGroup[]> {
  const languageGroups = (await getLeagueLegalLanguageSections()).map((section) => ({
    title: section.title,
    note: section.note,
    languages: section.values,
  }));

  const classGrantedLanguageGroup = DND_LANGUAGE_GROUPS.find(
    (group) => group.title === CLASS_GRANTED_LANGUAGE_GROUP_TITLE
  );

  if (classGrantedLanguageGroup) {
    languageGroups.push({
      title: classGrantedLanguageGroup.title,
      note: ("note" in classGrantedLanguageGroup
        ? classGrantedLanguageGroup.note
        : undefined) as string | undefined,
      languages: [...classGrantedLanguageGroup.languages],
    });
  }

  return languageGroups;
}
