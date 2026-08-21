import type { Tier } from "@prisma/client";

import { buildCsv } from "@/lib/csv";
import {
  buildStoredGameRewardStrings,
  type ParsedGameRewardSelections,
} from "@/lib/game-reward-selections";

export const PLAYER_LOGSHEET_IMPORT_COLUMNS = [
  {
    key: "datePlayed",
    header: "Date Played",
    description: "Required. Use a spreadsheet date or text like 2026-08-21.",
  },
  {
    key: "title",
    header: "Game Title",
    description: "Required.",
  },
  {
    key: "adventureCode",
    header: "Adventure Code",
    description: "Required.",
  },
  {
    key: "source",
    header: "Source (DM's Guild link)",
    description: "Optional.",
  },
  {
    key: "tier",
    header: "Tier",
    description: "Required. Use Tier 1-4 or TIER_1-TIER_4.",
  },
  {
    key: "dmName",
    header: "Dungeon Master",
    description: "Required.",
  },
  {
    key: "rewardsSummary",
    header: "Awarded Gold (Total in GP)",
    description: "Optional.",
  },
  {
    key: "magicItemsAwarded",
    header: "Magic Items Awarded",
    description: "Optional. Use line breaks inside one cell for multiple items.",
  },
  {
    key: "consumablesAwarded",
    header: "Consumables Awarded",
    description: "Optional. Use line breaks inside one cell for multiple items.",
  },
  {
    key: "spellbookAwarded",
    header: "Spellbooks Awarded",
    description: "Optional.",
  },
  {
    key: "sessionNotes",
    header: "Session Notes/Story Awards",
    description: "Optional. Use line breaks inside one cell for multiple notes.",
  },
] as const;

const DETAILED_PLAYER_LOGSHEET_TEMPLATE_HEADERS = [
  "Date",
  "Game Title",
  "Adventure Code",
  "Source (DM's Guild Link)",
  "DM",
  "Tier",
  "Downtime Days Awarded",
  "Leveled Up",
  "Awarded Gold (Total GP)",
  ...Array.from({ length: 10 }, (_, index) => [
    `Uncommon+ Magic Item (Counts As) ${index + 1}`,
    "Item Name",
    "Minor Property",
    "Notes (Flavor)",
  ]).flat(),
  ...Array.from({ length: 5 }, (_, index) => [
    `Common Magic Item (Counts As) ${index + 1}`,
    "Item Name",
    "Minor Property",
    "Notes (Flavor)",
  ]).flat(),
  ...Array.from({ length: 10 }, (_, index) => `Consumable ${index + 1}`),
  "Spellbooks",
  "Spellbook Rewards (Spells)",
  ...Array.from({ length: 3 }, (_, index) => `Boon ${index + 1}`),
  ...Array.from({ length: 3 }, (_, index) => `Blessing ${index + 1}`),
  ...Array.from({ length: 3 }, (_, index) => `Charm ${index + 1}`),
  "Additional Magic Reward Notes",
  "Additional Consumable Notes",
  "Session Notes / Story Awards",
] as const;

const IMPORT_REQUIRED_FIELDS = [
  "datePlayed",
  "title",
  "adventureCode",
  "tier",
  "dmName",
] as const;

export type PlayerLogsheetImportField = (typeof PLAYER_LOGSHEET_IMPORT_COLUMNS)[number]["key"];

export const PLAYER_LOGSHEET_IMPORT_HEADER_ALIASES: Record<
  PlayerLogsheetImportField,
  string[]
> = {
  datePlayed: ["date", "date played"],
  title: ["game title", "title"],
  adventureCode: ["adventure code", "code"],
  source: ["source", "source (dm's guild link)", "dms guild link", "dm's guild link"],
  tier: ["tier"],
  dmName: ["dungeon master", "dm", "dm name"],
  rewardsSummary: [
    "awarded gold (total in gp)",
    "awarded gold total gp",
    "awarded gold",
    "gold",
    "gold awarded",
  ],
  magicItemsAwarded: ["magic items awarded", "magic items"],
  consumablesAwarded: ["consumables awarded", "consumables"],
  spellbookAwarded: ["spellbooks awarded", "spellbooks", "spellbook awarded"],
  sessionNotes: ["session notes/story awards", "session notes", "story awards"],
};

export function normalizePlayerLogsheetHeader(value: string) {
  return value
    .replace(/^\ufeff/, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildPlayerLogsheetTemplateCsv() {
  return buildCsv([Array.from(DETAILED_PLAYER_LOGSHEET_TEMPLATE_HEADERS)]);
}

export function getMissingPlayerLogsheetFields(normalizedHeaders: string[]) {
  return IMPORT_REQUIRED_FIELDS.filter((field) => {
    const aliases = PLAYER_LOGSHEET_IMPORT_HEADER_ALIASES[field];
    return !aliases.some((alias) => normalizedHeaders.includes(normalizePlayerLogsheetHeader(alias)));
  });
}

export function getImportedCellValue(
  normalizedHeaders: string[],
  row: string[],
  aliases: string[],
) {
  for (const alias of aliases) {
    const index = normalizedHeaders.indexOf(normalizePlayerLogsheetHeader(alias));

    if (index >= 0) {
      return String(row[index] ?? "");
    }
  }

  return "";
}

function normalizeImportValue(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function appendRewardLine(lines: string[], value: string) {
  const normalized = normalizeImportValue(value);

  if (normalized) {
    lines.push(normalized);
  }
}

function formatIncompleteMagicItemNote(label: string, name: string, minorProperty: string, flavor: string) {
  const details = [
    name ? `Name: ${name}` : "",
    minorProperty ? `Minor Property: ${minorProperty}` : "",
    flavor ? `Notes (Flavor): ${flavor}` : "",
  ].filter(Boolean);

  return details.length ? `${label} - ${details.join(" | ")}` : label;
}

function readMagicItemSelections(
  normalizedHeaders: string[],
  row: string[],
  prefix: "common magic item counts as" | "uncommon magic item counts as",
  selections: ParsedGameRewardSelections,
  incompleteNotes: string[],
) {
  for (let index = 0; index < normalizedHeaders.length; index += 1) {
    const header = normalizedHeaders[index] ?? "";
    const match = header.match(new RegExp(`^${prefix} (\\d+)$`));

    if (!match) {
      continue;
    }

    const item = normalizeImportValue(String(row[index] ?? ""));
    const name = normalizeImportValue(String(row[index + 1] ?? ""));
    const minorProperty = normalizeImportValue(String(row[index + 2] ?? ""));
    const flavor = normalizeImportValue(String(row[index + 3] ?? ""));

    if (item) {
      if (prefix.startsWith("uncommon")) {
        selections.buildMagicItems.push(item);
        selections.buildMagicItemNames.push(name);
        selections.buildMagicItemMinorProperties.push(minorProperty);
        selections.buildMagicItemFlavors.push(flavor);
      } else {
        selections.commonMagicItems.push(item);
        selections.commonMagicItemNames.push(name);
        selections.commonMagicItemMinorProperties.push(minorProperty);
        selections.commonMagicItemFlavors.push(flavor);
      }

      continue;
    }

    if (name || minorProperty || flavor) {
      incompleteNotes.push(
        formatIncompleteMagicItemNote(
          `${prefix.startsWith("uncommon") ? "Uncommon+" : "Common"} magic item ${match[1]}`,
          name,
          minorProperty,
          flavor,
        ),
      );
    }
  }
}

function collectNumberedColumnValues(
  normalizedHeaders: string[],
  row: string[],
  prefix: string,
) {
  return normalizedHeaders.reduce<string[]>((values, header, index) => {
    if (!header.match(new RegExp(`^${prefix} \\d+$`))) {
      return values;
    }

    appendRewardLine(values, String(row[index] ?? ""));
    return values;
  }, []);
}

function isTruthyImportFlag(value: string) {
  const normalized = normalizeImportValue(value).toLowerCase();

  return ["yes", "true", "1", "y"].includes(normalized);
}

export function isMeaningfulPlayerLogsheetRow(
  normalizedHeaders: string[],
  row: string[],
) {
  return row.some((value, index) => {
    const normalizedValue = normalizeImportValue(String(value ?? ""));

    if (!normalizedValue) {
      return false;
    }

    const header = normalizedHeaders[index] ?? "";

    if (header === "leveled up") {
      return isTruthyImportFlag(normalizedValue);
    }

    if (header === "downtime days awarded") {
      return normalizedValue !== "0";
    }

    return true;
  });
}

export function buildImportedRewardStrings(
  normalizedHeaders: string[],
  row: string[],
) {
  const selections: ParsedGameRewardSelections = {
    buildMagicItems: [],
    buildMagicItemNames: [],
    buildMagicItemMinorProperties: [],
    buildMagicItemFlavors: [],
    commonMagicItems: [],
    commonMagicItemNames: [],
    commonMagicItemMinorProperties: [],
    commonMagicItemFlavors: [],
    consumables: [],
    boons: [],
    blessings: [],
    charms: [],
    additionalMagicRewardNotes: "",
    additionalConsumableNotes: "",
  };
  const additionalMagicNotes: string[] = [];
  const sessionNotesParts: string[] = [];
  const spellbookParts: string[] = [];

  readMagicItemSelections(
    normalizedHeaders,
    row,
    "uncommon magic item counts as",
    selections,
    additionalMagicNotes,
  );
  readMagicItemSelections(
    normalizedHeaders,
    row,
    "common magic item counts as",
    selections,
    additionalMagicNotes,
  );

  selections.consumables = collectNumberedColumnValues(normalizedHeaders, row, "consumable");
  selections.boons = collectNumberedColumnValues(normalizedHeaders, row, "boon");
  selections.blessings = collectNumberedColumnValues(normalizedHeaders, row, "blessing");
  selections.charms = collectNumberedColumnValues(normalizedHeaders, row, "charm");

  appendRewardLine(
    spellbookParts,
    getImportedCellValue(normalizedHeaders, row, PLAYER_LOGSHEET_IMPORT_HEADER_ALIASES.spellbookAwarded),
  );

  const spellRewards = normalizeImportValue(
    getImportedCellValue(normalizedHeaders, row, ["spellbook rewards spells"]),
  );

  if (spellRewards) {
    spellbookParts.push(`Spells: ${spellRewards}`);
  }

  const additionalMagic = normalizeImportValue(
    getImportedCellValue(normalizedHeaders, row, ["additional magic reward notes"]),
  );
  const additionalConsumables = normalizeImportValue(
    getImportedCellValue(normalizedHeaders, row, ["additional consumable notes"]),
  );
  const sessionNotes = normalizeImportValue(
    getImportedCellValue(normalizedHeaders, row, PLAYER_LOGSHEET_IMPORT_HEADER_ALIASES.sessionNotes),
  );
  const downtimeAwarded = normalizeImportValue(
    getImportedCellValue(normalizedHeaders, row, ["downtime days awarded"]),
  );
  const leveledUp = normalizeImportValue(
    getImportedCellValue(normalizedHeaders, row, ["leveled up"]),
  );

  if (sessionNotes) {
    sessionNotesParts.push(sessionNotes);
  }

  if (downtimeAwarded && downtimeAwarded !== "0") {
    sessionNotesParts.push(`Downtime Days Awarded: ${downtimeAwarded}`);
  }

  if (isTruthyImportFlag(leveledUp)) {
    sessionNotesParts.push("Leveled Up: Yes");
  }

  selections.additionalMagicRewardNotes = [...additionalMagicNotes, additionalMagic]
    .filter(Boolean)
    .join("\n");
  selections.additionalConsumableNotes = additionalConsumables;

  return {
    ...buildStoredGameRewardStrings(selections),
    sessionNotes: sessionNotesParts.join("\n").trim(),
    spellbookAwarded: spellbookParts.join("\n").trim(),
  };
}

export function normalizeImportedTier(value: string): Tier | null {
  const normalized = normalizePlayerLogsheetHeader(value);

  if (!normalized) {
    return null;
  }

  if (normalized === "1" || normalized === "tier 1" || normalized === "tier1") {
    return "TIER_1";
  }

  if (normalized === "2" || normalized === "tier 2" || normalized === "tier2") {
    return "TIER_2";
  }

  if (normalized === "3" || normalized === "tier 3" || normalized === "tier3") {
    return "TIER_3";
  }

  if (normalized === "4" || normalized === "tier 4" || normalized === "tier4") {
    return "TIER_4";
  }

  return null;
}
