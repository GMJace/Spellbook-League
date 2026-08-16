import { parseAdventureCatalogListJson } from "@/lib/adventure-catalog";
import type { LegalMagicItemOptionsMap } from "@/lib/league-legal-choices";

export type AdminModuleMagicItemValue = {
  flavorNotes: string;
  item: string;
  minorProperty: string;
  name: string;
};

export type AdminModuleUncommonPlusMagicItemValue = AdminModuleMagicItemValue & {
  rarity: "LEGENDARY" | "RARE" | "UNCOMMON" | "UNIQUE" | "VERY_RARE";
};

export function parseAdminModuleMagicItem(line: string): AdminModuleMagicItemValue {
  let item = line.trim();
  let name = "";
  let minorProperty = "";
  let flavorNotes = "";
  const detailPattern = /\s+\((Name|Minor Property|Notes \(Flavor\)|Flavor):\s*([^)]*)\)\s*$/;

  while (true) {
    const match = item.match(detailPattern);

    if (!match || match.index == null) {
      break;
    }

    const [, label, value] = match;

    if (label === "Name") {
      name = value.trim();
    } else if (label === "Minor Property") {
      minorProperty = value.trim();
    } else if (label === "Notes (Flavor)" || label === "Flavor") {
      flavorNotes = value.trim();
    }

    item = item.slice(0, match.index).trim();
  }

  return {
    flavorNotes,
    item,
    minorProperty,
    name,
  };
}

export function buildUncommonPlusMagicItems(module: {
  uncommonMagicItemsJson: string;
  rareMagicItemsJson: string;
  veryRareMagicItemsJson: string;
  legendaryMagicItemsJson: string;
  uniqueMagicItemsJson: string;
}): AdminModuleUncommonPlusMagicItemValue[] {
  return [
    ...parseAdventureCatalogListJson(module.uncommonMagicItemsJson).map((line) => ({
      ...parseAdminModuleMagicItem(line),
      rarity: "UNCOMMON" as const,
    })),
    ...parseAdventureCatalogListJson(module.rareMagicItemsJson).map((line) => ({
      ...parseAdminModuleMagicItem(line),
      rarity: "RARE" as const,
    })),
    ...parseAdventureCatalogListJson(module.veryRareMagicItemsJson).map((line) => ({
      ...parseAdminModuleMagicItem(line),
      rarity: "VERY_RARE" as const,
    })),
    ...parseAdventureCatalogListJson(module.legendaryMagicItemsJson).map((line) => ({
      ...parseAdminModuleMagicItem(line),
      rarity: "LEGENDARY" as const,
    })),
    ...parseAdventureCatalogListJson(module.uniqueMagicItemsJson).map((line) => ({
      ...parseAdminModuleMagicItem(line),
      rarity: "UNIQUE" as const,
    })),
  ];
}

export function buildUncommonPlusRarityByItem(
  legalMagicItemOptions: LegalMagicItemOptionsMap
) {
  return {
    ...Object.fromEntries(legalMagicItemOptions.Uncommon.map((item) => [item, "UNCOMMON" as const])),
    ...Object.fromEntries(legalMagicItemOptions.Rare.map((item) => [item, "RARE" as const])),
    ...Object.fromEntries(
      legalMagicItemOptions["Very Rare"].map((item) => [item, "VERY_RARE" as const])
    ),
    ...Object.fromEntries(
      legalMagicItemOptions.Legendary.map((item) => [item, "LEGENDARY" as const])
    ),
    ...Object.fromEntries(
      legalMagicItemOptions["Unique / Artifacts"].map((item) => [item, "UNIQUE" as const])
    ),
  };
}

export function mergeUniqueOptions(primary: string[], extras: string[]) {
  return Array.from(new Set([...primary, ...extras.filter(Boolean)]));
}
