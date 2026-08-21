import { buildCsv } from "@/lib/csv";
import {
  DND_SKILLS,
  serializeFeatSelections,
  serializeLanguageSelections,
  serializeSkillSelections,
  serializeToolSelections,
} from "@/lib/character";
import { DND_CLASSES, normalizeLeagueChoiceValues } from "@/lib/character-options";

export const CHARACTER_LOGSHEET_IMPORT_TEMPLATE_HEADERS = [
  "Character Name",
  "Character Sheet Link",
  "Publicly Viewable",
  "Character HP",
  "Character AC",
  "Passive Perception",
  "Character Spell Save DC",
  "Class 1",
  "Class 1 Subclass",
  "Class 1 Level",
  "Class 2",
  "Class 2 Subclass",
  "Class 2 Level",
  "Class 3",
  "Class 3 Subclass",
  "Class 3 Level",
  "Total Gold",
  "Total Level",
  "Tier",
  "Uncommon+ Magic Item (Counts As) 1",
  "Item Name ",
  "Minor Property",
  "Notes (Flavor)",
  "Uncommon+ Magic Item (Counts As) 2",
  "Item Name  2",
  "Minor Property 2",
  "Notes (Flavor) 2",
  "Uncommon+ Magic Item (Counts As) 3",
  "Item Name  3",
  "Minor Property 3",
  "Notes (Flavor) 3",
  "Uncommon+ Magic Item (Counts As) 4",
  "Item Name  4",
  "Minor Property 4",
  "Notes (Flavor) 4",
  "Uncommon+ Magic Item (Counts As) 5",
  "Item Name  5",
  "Minor Property 5",
  "Notes (Flavor) 5",
  "Uncommon+ Magic Item (Counts As) 6",
  "Item Name  6",
  "Minor Property 6",
  "Notes (Flavor) 6",
  "Uncommon+ Magic Item (Counts As) 7",
  "Item Name  7",
  "Minor Property 7",
  "Notes (Flavor) 7",
  "Uncommon+ Magic Item (Counts As) 8",
  "Item Name  8",
  "Minor Property 8",
  "Notes (Flavor) 8",
  "Uncommon+ Magic Item (Counts As) 9",
  "Item Name  9",
  "Minor Property 9",
  "Notes (Flavor) 9",
  "Uncommon+ Magic Item (Counts As) 10",
  "Item Name  10",
  "Minor Property 10",
  "Notes (Flavor) 10",
  "Common Magic Item (Counts As) 1",
  "Item Name  11",
  "Minor Property 11",
  "Notes (Flavor) 11",
  "Common Magic Item (Counts As) 2",
  "Item Name  12",
  "Minor Property 12",
  "Notes (Flavor) 12",
  "Common Magic Item (Counts As) 3",
  "Item Name  13",
  "Minor Property 13",
  "Notes (Flavor) 13",
  "Common Magic Item (Counts As) 4",
  "Item Name  14",
  "Minor Property 14",
  "Notes (Flavor) 14",
  "Common Magic Item (Counts As) 5",
  "Item Name  15",
  "Minor Property 15",
  "Notes (Flavor) 15",
  "Consumable Slot 1",
  "Consumable Slot 2",
  "Consumable Slot 3",
  "Consumable Slot 4",
  "Consumable Slot 5",
  "Consumable Slot 6",
  "Consumable Slot 7",
  "Consumable Slot 8",
  "Consumable Slot 9",
  "Consumable Slot 10",
  "Consumable Slot 11",
  "Consumable Slot 12",
  "Consumable Slot 13",
  "Consumable Slot 14",
  "Consumable Slot 15",
  "Blessing",
  "Boon",
  "Charms",
  "Skill Proficiencies",
  "Skill Expertise",
  "Artisan's Tools",
  "Other Tools and Kits",
  "Gaming Sets",
  "Musical Instruments",
  "Vehicles",
  "Languages",
  "Feats",
  "Character Backstory",
  "Notes",
] as const;

export function buildCharacterLogsheetTemplateCsv() {
  return buildCsv([Array.from(CHARACTER_LOGSHEET_IMPORT_TEMPLATE_HEADERS)]);
}

export function normalizeCharacterLogsheetHeader(value: string) {
  return value
    .replace(/^\ufeff/, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getCharacterImportedCellValue(
  normalizedHeaders: string[],
  row: string[],
  header: string,
) {
  const index = normalizedHeaders.indexOf(normalizeCharacterLogsheetHeader(header));
  return index >= 0 ? String(row[index] ?? "") : "";
}

export function parseCharacterImportBoolean(value: string) {
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

export function isMeaningfulCharacterLogsheetRow(
  normalizedHeaders: string[],
  row: string[],
) {
  return row.some((value, index) => {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      return false;
    }

    const header = normalizedHeaders[index] ?? "";

    if (header === "publicly viewable") {
      return parseCharacterImportBoolean(normalizedValue);
    }

    return true;
  });
}

function splitCharacterImportValues(value: string) {
  return normalizeLeagueChoiceValues(
    value
      .replace(/\r\n/g, "\n")
      .split(/\n|,|;/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

function buildCaseInsensitiveChoiceMap(options: string[]) {
  return new Map(options.map((option) => [option.trim().toLowerCase(), option]));
}

function matchChoice(value: string, choiceMap: Map<string, string>) {
  return choiceMap.get(value.trim().toLowerCase()) ?? value.trim();
}

function buildMagicItemSlots(
  normalizedHeaders: string[],
  row: string[],
  slotCount: number,
  baseLabel: "Common Magic Item (Counts As)" | "Uncommon+ Magic Item (Counts As)",
  choiceMap: Map<string, string>,
) {
  const items: string[] = [];
  const itemNames: string[] = [];
  const minorProperties: string[] = [];
  const flavors: string[] = [];

  for (let index = 1; index <= slotCount; index += 1) {
    const countsAs = getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      `${baseLabel} ${index}`,
    ).trim();
    const itemName = getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      index === 1 && baseLabel === "Uncommon+ Magic Item (Counts As)"
        ? "Item Name "
        : `Item Name  ${baseLabel === "Common Magic Item (Counts As)" ? index + 10 : index}`,
    ).trim();
    const minorProperty = getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      index === 1 && baseLabel === "Uncommon+ Magic Item (Counts As)"
        ? "Minor Property"
        : `Minor Property ${baseLabel === "Common Magic Item (Counts As)" ? index + 10 : index}`,
    ).trim();
    const flavor = getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      index === 1 && baseLabel === "Uncommon+ Magic Item (Counts As)"
        ? "Notes (Flavor)"
        : `Notes (Flavor) ${baseLabel === "Common Magic Item (Counts As)" ? index + 10 : index}`,
    ).trim();

    if (!itemName && !countsAs) {
      continue;
    }

    const selectedItem = matchChoice(countsAs || itemName, choiceMap);
    items.push(selectedItem);
    itemNames.push(itemName && itemName !== selectedItem ? itemName : "");
    minorProperties.push(minorProperty);
    flavors.push(flavor);
  }

  return {
    items,
    itemNames,
    minorProperties,
    flavors,
  };
}

function buildSkillSelections(
  proficiencyValue: string,
  expertiseValue: string,
) {
  const skillNameMap = new Map(
    DND_SKILLS.map((skill) => [skill.name.trim().toLowerCase(), skill.name]),
  );
  const selections: Partial<Record<(typeof DND_SKILLS)[number]["name"], "proficiency" | "expertise">> =
    {};

  for (const value of splitCharacterImportValues(proficiencyValue)) {
    const skillName = skillNameMap.get(value.toLowerCase());

    if (skillName) {
      selections[skillName] = "proficiency";
    }
  }

  for (const value of splitCharacterImportValues(expertiseValue)) {
    const skillName = skillNameMap.get(value.toLowerCase());

    if (skillName) {
      selections[skillName] = "expertise";
    }
  }

  return serializeSkillSelections(selections);
}

export function buildImportedCharacterRow(
  normalizedHeaders: string[],
  row: string[],
  options: {
    legalBuildMagicItemOptions: string[];
    legalCommonMagicItemOptions: string[];
    legalToolOptions: string[];
    legalLanguageOptions: string[];
    legalFeatOptions: string[];
  },
) {
  const buildMagicItemChoiceMap = buildCaseInsensitiveChoiceMap(options.legalBuildMagicItemOptions);
  const commonMagicItemChoiceMap = buildCaseInsensitiveChoiceMap(options.legalCommonMagicItemOptions);
  const toolChoiceMap = buildCaseInsensitiveChoiceMap(options.legalToolOptions);
  const languageChoiceMap = buildCaseInsensitiveChoiceMap(options.legalLanguageOptions);
  const featChoiceMap = buildCaseInsensitiveChoiceMap(options.legalFeatOptions);
  const classChoiceMap = buildCaseInsensitiveChoiceMap([...DND_CLASSES]);
  const buildMagicItems = buildMagicItemSlots(
    normalizedHeaders,
    row,
    10,
    "Uncommon+ Magic Item (Counts As)",
    buildMagicItemChoiceMap,
  );
  const commonMagicItems = buildMagicItemSlots(
    normalizedHeaders,
    row,
    5,
    "Common Magic Item (Counts As)",
    commonMagicItemChoiceMap,
  );

  return {
    name: getCharacterImportedCellValue(normalizedHeaders, row, "Character Name").trim(),
    characterSheetLink: getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      "Character Sheet Link",
    ).trim(),
    isPubliclyViewable: parseCharacterImportBoolean(
      getCharacterImportedCellValue(normalizedHeaders, row, "Publicly Viewable"),
    ),
    hitPoints: getCharacterImportedCellValue(normalizedHeaders, row, "Character HP").trim(),
    armorClass: getCharacterImportedCellValue(normalizedHeaders, row, "Character AC").trim(),
    passivePerception: getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      "Passive Perception",
    ).trim(),
    spellSaveDc: getCharacterImportedCellValue(
      normalizedHeaders,
      row,
      "Character Spell Save DC",
    ).trim(),
    class1Name: matchChoice(
      getCharacterImportedCellValue(normalizedHeaders, row, "Class 1"),
      classChoiceMap,
    ),
    class1Subclass: getCharacterImportedCellValue(normalizedHeaders, row, "Class 1 Subclass").trim(),
    class1Level: getCharacterImportedCellValue(normalizedHeaders, row, "Class 1 Level").trim(),
    class2Name: matchChoice(
      getCharacterImportedCellValue(normalizedHeaders, row, "Class 2"),
      classChoiceMap,
    ),
    class2Subclass: getCharacterImportedCellValue(normalizedHeaders, row, "Class 2 Subclass").trim(),
    class2Level: getCharacterImportedCellValue(normalizedHeaders, row, "Class 2 Level").trim(),
    class3Name: matchChoice(
      getCharacterImportedCellValue(normalizedHeaders, row, "Class 3"),
      classChoiceMap,
    ),
    class3Subclass: getCharacterImportedCellValue(normalizedHeaders, row, "Class 3 Subclass").trim(),
    class3Level: getCharacterImportedCellValue(normalizedHeaders, row, "Class 3 Level").trim(),
    totalGold: getCharacterImportedCellValue(normalizedHeaders, row, "Total Gold").trim(),
    magicItems: buildMagicItems.items,
    magicItemNames: buildMagicItems.itemNames,
    magicItemMinorProperties: buildMagicItems.minorProperties,
    magicItemFlavors: buildMagicItems.flavors,
    commonMagicItems: commonMagicItems.items,
    commonMagicItemNames: commonMagicItems.itemNames,
    commonMagicItemMinorProperties: commonMagicItems.minorProperties,
    commonMagicItemFlavors: commonMagicItems.flavors,
    consumables: Array.from({ length: 15 }, (_, index) =>
      getCharacterImportedCellValue(normalizedHeaders, row, `Consumable Slot ${index + 1}`).trim(),
    ).filter(Boolean),
    blessing: getCharacterImportedCellValue(normalizedHeaders, row, "Blessing").trim(),
    boon: getCharacterImportedCellValue(normalizedHeaders, row, "Boon").trim(),
    charms: splitCharacterImportValues(
      getCharacterImportedCellValue(normalizedHeaders, row, "Charms"),
    ),
    proficiencies: buildSkillSelections(
      getCharacterImportedCellValue(normalizedHeaders, row, "Skill Proficiencies"),
      getCharacterImportedCellValue(normalizedHeaders, row, "Skill Expertise"),
    ),
    tools: serializeToolSelections(
      splitCharacterImportValues(
        [
          getCharacterImportedCellValue(normalizedHeaders, row, "Artisan's Tools"),
          getCharacterImportedCellValue(normalizedHeaders, row, "Other Tools and Kits"),
          getCharacterImportedCellValue(normalizedHeaders, row, "Gaming Sets"),
          getCharacterImportedCellValue(normalizedHeaders, row, "Musical Instruments"),
          getCharacterImportedCellValue(normalizedHeaders, row, "Vehicles"),
        ].join("\n"),
      ).reduce((selected, value) => {
        selected[matchChoice(value, toolChoiceMap)] = true;
        return selected;
      }, {} as Record<string, true>),
    ),
    languages: serializeLanguageSelections(
      splitCharacterImportValues(
        getCharacterImportedCellValue(normalizedHeaders, row, "Languages"),
      ).reduce((selected, value) => {
        selected[matchChoice(value, languageChoiceMap)] = true;
        return selected;
      }, {} as Record<string, true>),
    ),
    feats: serializeFeatSelections(
      splitCharacterImportValues(getCharacterImportedCellValue(normalizedHeaders, row, "Feats"))
        .reduce((selected, value) => {
          selected[matchChoice(value, featChoiceMap)] = true;
          return selected;
        }, {} as Record<string, true>),
    ),
    backstory: getCharacterImportedCellValue(normalizedHeaders, row, "Character Backstory").trim(),
    notes: getCharacterImportedCellValue(normalizedHeaders, row, "Notes").trim(),
  };
}
