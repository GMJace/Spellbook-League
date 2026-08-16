import type { AdventureCatalog } from "@prisma/client";

import {
  buildAdventureCatalogAutofillPayload,
  normalizeAdventureLookupValue,
  parseAdventureCatalogListJson,
  type AdventureCatalogAutofillPayload,
  type AdventureCatalogRecord,
} from "@/lib/adventure-catalog";
import { prisma } from "@/lib/prisma";

function mapAdventureCatalogRow(row: AdventureCatalog): AdventureCatalogRecord {
  return {
    adventureCode: row.adventureCode,
    title: row.title,
    tier: row.tier,
    duration: row.duration,
    gold: row.gold,
    spellbook: row.spellbook,
    storyAwards: row.storyAwards,
    pageNumbers: row.pageNumbers,
    sourceSheet: row.sourceSheet,
    sourceNotes: row.sourceNotes,
    consumables: parseAdventureCatalogListJson(row.consumablesJson),
    commonMagicItems: parseAdventureCatalogListJson(row.commonMagicItemsJson),
    uncommonMagicItems: parseAdventureCatalogListJson(row.uncommonMagicItemsJson),
    rareMagicItems: parseAdventureCatalogListJson(row.rareMagicItemsJson),
    veryRareMagicItems: parseAdventureCatalogListJson(row.veryRareMagicItemsJson),
    legendaryMagicItems: parseAdventureCatalogListJson(row.legendaryMagicItemsJson),
    uniqueMagicItems: parseAdventureCatalogListJson(row.uniqueMagicItemsJson),
  };
}

export async function findAdventureCatalogAutofill(params: {
  adventureCode?: string;
  title?: string;
  tier?: AdventureCatalog["tier"] | string;
}): Promise<AdventureCatalogAutofillPayload | null> {
  const lookupCode = normalizeAdventureLookupValue(params.adventureCode ?? "");
  const lookupTitle = normalizeAdventureLookupValue(params.title ?? "");
  const tier =
    params.tier === "TIER_1" ||
    params.tier === "TIER_2" ||
    params.tier === "TIER_3" ||
    params.tier === "TIER_4"
      ? params.tier
      : null;

  if (!lookupCode && !lookupTitle) {
    return null;
  }

  if (lookupCode && lookupTitle && tier) {
    const exactMatch = await prisma.adventureCatalog.findUnique({
      where: {
        lookupCode_lookupTitle_tier: {
          lookupCode,
          lookupTitle,
          tier,
        },
      },
    });

    if (exactMatch) {
      return buildAdventureCatalogAutofillPayload(mapAdventureCatalogRow(exactMatch));
    }
  }

  if (lookupCode) {
    const byCode = await prisma.adventureCatalog.findFirst({
      where: {
        lookupCode,
        ...(tier ? { tier } : {}),
      },
      orderBy: [{ title: "asc" }, { adventureCode: "asc" }],
    });

    if (byCode) {
      return buildAdventureCatalogAutofillPayload(mapAdventureCatalogRow(byCode));
    }
  }

  if (!lookupTitle) {
    return null;
  }

  const byTitle = await prisma.adventureCatalog.findFirst({
    where: {
      lookupTitle,
      ...(tier ? { tier } : {}),
    },
    orderBy: [{ title: "asc" }, { adventureCode: "asc" }],
  });

  return byTitle
    ? buildAdventureCatalogAutofillPayload(mapAdventureCatalogRow(byTitle))
    : null;
}
