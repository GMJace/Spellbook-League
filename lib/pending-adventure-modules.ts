import type { Prisma, Tier } from "@prisma/client";

import { normalizeAdventureLookupValue, parseAdventureCatalogListJson, serializeAdventureCatalogList } from "@/lib/adventure-catalog";
import {
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
  type LegalMagicItemOptionsMap,
} from "@/lib/league-legal-choices";
import { parseStoredGameRewardSelections } from "@/lib/game-reward-selections";
import { prisma } from "@/lib/prisma";

function mergeUniqueValues(primary: string[], extras: string[]) {
  return Array.from(new Set([...primary, ...extras].map((value) => value.trim()).filter(Boolean)));
}

function mergeMultilineNotes(primary: string, extras: string) {
  return Array.from(
    new Set(
      [primary, extras]
        .flatMap((value) => value.replace(/\r\n/g, "\n").split("\n"))
        .map((line) => line.trim())
        .filter(Boolean)
    )
  ).join("\n");
}

function bucketUncommonPlusItemsByRarity(
  items: string[],
  legalMagicItemOptions: LegalMagicItemOptionsMap
) {
  const uncommonSet = new Set(legalMagicItemOptions.Uncommon);
  const rareSet = new Set(legalMagicItemOptions.Rare);
  const veryRareSet = new Set(legalMagicItemOptions["Very Rare"]);
  const legendarySet = new Set(legalMagicItemOptions.Legendary);

  const uncommonMagicItems: string[] = [];
  const rareMagicItems: string[] = [];
  const veryRareMagicItems: string[] = [];
  const legendaryMagicItems: string[] = [];
  const uniqueMagicItems: string[] = [];

  for (const item of items) {
    if (uncommonSet.has(item)) {
      uncommonMagicItems.push(item);
    } else if (rareSet.has(item)) {
      rareMagicItems.push(item);
    } else if (veryRareSet.has(item)) {
      veryRareMagicItems.push(item);
    } else if (legendarySet.has(item)) {
      legendaryMagicItems.push(item);
    } else {
      uniqueMagicItems.push(item);
    }
  }

  return {
    uncommonMagicItems,
    rareMagicItems,
    veryRareMagicItems,
    legendaryMagicItems,
    uniqueMagicItems,
  };
}

async function hasLiveAdventureCatalogMatch(params: {
  adventureCode: string;
  title: string;
  tier: Tier;
}) {
  const lookupCode = normalizeAdventureLookupValue(params.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(params.title);

  if (!lookupCode && !lookupTitle) {
    return false;
  }

  if (lookupCode && lookupTitle) {
    const exactMatch = await prisma.adventureCatalog.findUnique({
      where: {
        lookupCode_lookupTitle_tier: {
          lookupCode,
          lookupTitle,
          tier: params.tier,
        },
      },
      select: { id: true },
    });

    if (exactMatch) {
      return true;
    }
  }

  if (lookupCode) {
    const byCode = await prisma.adventureCatalog.findFirst({
      where: {
        lookupCode,
        tier: params.tier,
      },
      select: { id: true },
    });

    if (byCode) {
      return true;
    }
  }

  if (!lookupTitle) {
    return false;
  }

  const byTitle = await prisma.adventureCatalog.findFirst({
    where: {
      lookupTitle,
      tier: params.tier,
    },
    select: { id: true },
  });

  return Boolean(byTitle);
}

export async function syncPendingAdventureModuleFromPlayerLog(input: {
  adventureCode: string;
  title: string;
  tier: Tier;
  source: string;
  dmName: string;
  datePlayed: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  spellbookAwarded: string;
  sessionNotes: string;
  reportedByUserId: string;
}) {
  const lookupCode = normalizeAdventureLookupValue(input.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(input.title);

  if ((!lookupCode && !lookupTitle) || (await hasLiveAdventureCatalogMatch(input))) {
    return;
  }

  const [
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  ] = await Promise.all([
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  const parsedSelections = parseStoredGameRewardSelections(
    {
      magicItemsAwarded: input.magicItemsAwarded,
      consumablesAwarded: input.consumablesAwarded,
    },
    {
      legalBuildMagicItemOptions: [
        ...legalMagicItemOptions.Uncommon,
        ...legalMagicItemOptions.Rare,
        ...legalMagicItemOptions["Very Rare"],
        ...legalMagicItemOptions.Legendary,
        ...legalMagicItemOptions["Unique / Artifacts"],
      ],
      legalCommonMagicItemOptions: legalMagicItemOptions.Common,
      legalConsumableOptions,
      legalBoonOptions,
      legalBlessingOptions,
      legalCharmOptions,
      legalMinorPropertyOptions,
    }
  );

  const uncommonPlusBuckets = bucketUncommonPlusItemsByRarity(
    parsedSelections.buildMagicItems,
    legalMagicItemOptions
  );
  const reportedDatePlayed = new Date(input.datePlayed);
  const pendingModule = await prisma.pendingAdventureModule.findUnique({
    where: {
      lookupCode_lookupTitle_tier: {
        lookupCode,
        lookupTitle,
        tier: input.tier,
      },
    },
  });

  if (!pendingModule) {
    await prisma.pendingAdventureModule.create({
      data: {
        adventureCode: input.adventureCode,
        lookupCode,
        title: input.title,
        lookupTitle,
        tier: input.tier,
        sourceSheet: input.source,
        gold: input.rewardsSummary,
        spellbook: input.spellbookAwarded,
        storyAwards: input.sessionNotes,
        consumablesJson: serializeAdventureCatalogList(parsedSelections.consumables),
        commonMagicItemsJson: serializeAdventureCatalogList(parsedSelections.commonMagicItems),
        uncommonMagicItemsJson: serializeAdventureCatalogList(uncommonPlusBuckets.uncommonMagicItems),
        rareMagicItemsJson: serializeAdventureCatalogList(uncommonPlusBuckets.rareMagicItems),
        veryRareMagicItemsJson: serializeAdventureCatalogList(uncommonPlusBuckets.veryRareMagicItems),
        legendaryMagicItemsJson: serializeAdventureCatalogList(uncommonPlusBuckets.legendaryMagicItems),
        uniqueMagicItemsJson: serializeAdventureCatalogList(uncommonPlusBuckets.uniqueMagicItems),
        boonsJson: serializeAdventureCatalogList(parsedSelections.boons),
        blessingsJson: serializeAdventureCatalogList(parsedSelections.blessings),
        charmsJson: serializeAdventureCatalogList(parsedSelections.charms),
        additionalMagicRewardNotes: parsedSelections.additionalMagicRewardNotes,
        additionalConsumableNotes: parsedSelections.additionalConsumableNotes,
        lastReportedByUserId: input.reportedByUserId,
        reportedDmName: input.dmName,
        reportedDatePlayed: Number.isNaN(reportedDatePlayed.getTime())
          ? null
          : reportedDatePlayed,
        lastReportedAt: new Date(),
      },
    });

    return;
  }

  await prisma.pendingAdventureModule.update({
    where: { id: pendingModule.id },
    data: {
      adventureCode: input.adventureCode,
      title: input.title,
      sourceSheet: pendingModule.sourceSheet || input.source,
      gold: pendingModule.gold || input.rewardsSummary,
      spellbook: pendingModule.spellbook || input.spellbookAwarded,
      storyAwards: pendingModule.storyAwards || input.sessionNotes,
      consumablesJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.consumablesJson),
          parsedSelections.consumables
        )
      ),
      commonMagicItemsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.commonMagicItemsJson),
          parsedSelections.commonMagicItems
        )
      ),
      uncommonMagicItemsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.uncommonMagicItemsJson),
          uncommonPlusBuckets.uncommonMagicItems
        )
      ),
      rareMagicItemsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.rareMagicItemsJson),
          uncommonPlusBuckets.rareMagicItems
        )
      ),
      veryRareMagicItemsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.veryRareMagicItemsJson),
          uncommonPlusBuckets.veryRareMagicItems
        )
      ),
      legendaryMagicItemsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.legendaryMagicItemsJson),
          uncommonPlusBuckets.legendaryMagicItems
        )
      ),
      uniqueMagicItemsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.uniqueMagicItemsJson),
          uncommonPlusBuckets.uniqueMagicItems
        )
      ),
      boonsJson: serializeAdventureCatalogList(
        mergeUniqueValues(parseAdventureCatalogListJson(pendingModule.boonsJson), parsedSelections.boons)
      ),
      blessingsJson: serializeAdventureCatalogList(
        mergeUniqueValues(
          parseAdventureCatalogListJson(pendingModule.blessingsJson),
          parsedSelections.blessings
        )
      ),
      charmsJson: serializeAdventureCatalogList(
        mergeUniqueValues(parseAdventureCatalogListJson(pendingModule.charmsJson), parsedSelections.charms)
      ),
      additionalMagicRewardNotes: mergeMultilineNotes(
        pendingModule.additionalMagicRewardNotes,
        parsedSelections.additionalMagicRewardNotes
      ),
      additionalConsumableNotes: mergeMultilineNotes(
        pendingModule.additionalConsumableNotes,
        parsedSelections.additionalConsumableNotes
      ),
      lastReportedByUserId: input.reportedByUserId,
      reportedDmName: input.dmName,
      reportedDatePlayed: Number.isNaN(reportedDatePlayed.getTime()) ? null : reportedDatePlayed,
      reportCount: {
        increment: 1,
      },
      lastReportedAt: new Date(),
    },
  });
}
