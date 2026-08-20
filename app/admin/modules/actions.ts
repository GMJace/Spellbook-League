"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  normalizeAdventureLookupValue,
  serializeAdventureCatalogList,
} from "@/lib/adventure-catalog";
import { requireAdminUser } from "@/lib/admin";
import { serializeGameSummarySections } from "@/lib/game-summary";
import { convertImageFileToDataUrl } from "@/lib/image-data-url";
import { prisma } from "@/lib/prisma";

const MAX_ADVENTURE_IMAGE_SIZE = 5 * 1024 * 1024;

const simpleListSchema = z.array(z.string().trim().min(1).max(200)).max(100);
const structuredMagicItemSchema = z
  .array(
    z.object({
      flavorNotes: z.string().trim().max(200).default(""),
      item: z.string().trim().min(1).max(200),
      minorProperty: z.string().trim().max(120).default(""),
      name: z.string().trim().max(200).default(""),
    })
  )
  .max(100);
const uncommonPlusMagicItemSchema = z
  .array(
    z.object({
      flavorNotes: z.string().trim().max(200).default(""),
      item: z.string().trim().min(1).max(200),
      minorProperty: z.string().trim().max(120).default(""),
      rarity: z.enum(["LEGENDARY", "RARE", "UNCOMMON", "UNIQUE", "VERY_RARE"]),
      name: z.string().trim().max(200).default(""),
    })
  )
  .max(100);

const adventureModuleSchema = z.object({
  adventureCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  duration: z.string().trim().max(80).default(""),
  sourceSheet: z.string().trim().max(2000).default(""),
  gameSummary: z.string().trim().max(4000).default(""),
  serviceHours: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? 0 : Number(trimmed);
      }

      return value;
    },
    z.number().finite().min(0).max(999)
  ),
  downtimeDaysAwarded: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? 0 : Number(trimmed);
      }

      return value;
    },
    z.number().int().min(0).max(999)
  ),
  gold: z.string().trim().max(240).default(""),
  spellbook: z.string().trim().max(4000).default(""),
  storyAwards: z.string().trim().max(8000).default(""),
  sourceNotes: z.string().trim().max(8000).default(""),
  commonMagicItems: structuredMagicItemSchema,
  uncommonPlusMagicItems: uncommonPlusMagicItemSchema,
  consumables: simpleListSchema,
  boons: simpleListSchema,
  blessings: simpleListSchema,
  charms: simpleListSchema,
  additionalMagicRewardNotes: z.string().trim().max(8000).default(""),
  additionalConsumableNotes: z.string().trim().max(8000).default(""),
});

const updateAdventureModuleSchema = adventureModuleSchema.extend({
  moduleId: z.string().trim().min(1),
});

function readStringListField(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function formatModuleMagicItemLine(item: {
  flavorNotes?: string;
  item: string;
  minorProperty?: string;
  name?: string;
}) {
  const details = [
    item.name?.trim() ? `(Name: ${item.name.trim()})` : "",
    item.minorProperty?.trim() ? `(Minor Property: ${item.minorProperty.trim()})` : "",
    item.flavorNotes?.trim() ? `(Notes (Flavor): ${item.flavorNotes.trim()})` : "",
  ].filter(Boolean);

  return details.length ? `${item.item.trim()} ${details.join(" ")}` : item.item.trim();
}

function readStructuredMagicItems(
  formData: FormData,
  fieldNames: {
    flavorNotes: string;
    items: string;
    minorProperties: string;
    names: string;
  }
) {
  const items = formData.getAll(fieldNames.items).map((value) => String(value).trim());
  const names = formData.getAll(fieldNames.names).map((value) => String(value).trim());
  const minorProperties = formData
    .getAll(fieldNames.minorProperties)
    .map((value) => String(value).trim());
  const flavorNotes = formData
    .getAll(fieldNames.flavorNotes)
    .map((value) => String(value).trim());
  const entries: Array<{ flavorNotes: string; item: string; minorProperty: string; name: string }> =
    [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] ?? "";

    if (!item) {
      continue;
    }

    entries.push({
      flavorNotes: flavorNotes[index] ?? "",
      item,
      minorProperty: minorProperties[index] ?? "",
      name: names[index] ?? "",
    });
  }

  return entries;
}

function readUncommonPlusMagicItems(formData: FormData) {
  const rarities = formData
    .getAll("moduleUncommonPlusMagicItemRarities")
    .map((value) => String(value).trim());
  const items = formData
    .getAll("moduleBuildMagicItems")
    .map((value) => String(value).trim());
  const names = formData.getAll("moduleUncommonPlusMagicItemNames").map((value) => String(value).trim());
  const minorProperties = formData
    .getAll("moduleUncommonPlusMagicItemMinorProperties")
    .map((value) => String(value).trim());
  const flavorNotes = formData
    .getAll("moduleUncommonPlusMagicItemFlavors")
    .map((value) => String(value).trim());
  const entries: Array<{
    flavorNotes: string;
    item: string;
    minorProperty: string;
    rarity: string;
    name: string;
  }> = [];

  for (let index = 0; index < Math.max(rarities.length, items.length); index += 1) {
    const item = items[index] ?? "";
    const rarity = rarities[index] ?? "UNCOMMON";

    if (!item) {
      continue;
    }

    entries.push({
      flavorNotes: flavorNotes[index] ?? "",
      item,
      minorProperty: minorProperties[index] ?? "",
      rarity,
      name: names[index] ?? "",
    });
  }

  return entries;
}

function splitUncommonPlusMagicItems(
  items: Array<{
    flavorNotes: string;
    item: string;
    minorProperty: string;
    rarity: "LEGENDARY" | "RARE" | "UNCOMMON" | "UNIQUE" | "VERY_RARE";
    name: string;
  }>
) {
  const buckets = {
    uncommonMagicItems: [] as string[],
    rareMagicItems: [] as string[],
    veryRareMagicItems: [] as string[],
    legendaryMagicItems: [] as string[],
    uniqueMagicItems: [] as string[],
  };

  for (const item of items) {
    const formattedLine = formatModuleMagicItemLine(item);

    if (item.rarity === "UNCOMMON") {
      buckets.uncommonMagicItems.push(formattedLine);
    } else if (item.rarity === "RARE") {
      buckets.rareMagicItems.push(formattedLine);
    } else if (item.rarity === "VERY_RARE") {
      buckets.veryRareMagicItems.push(formattedLine);
    } else if (item.rarity === "LEGENDARY") {
      buckets.legendaryMagicItems.push(formattedLine);
    } else {
      buckets.uniqueMagicItems.push(formattedLine);
    }
  }

  return buckets;
}

async function saveAdventureImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return { error: "Adventure art must be an image file." } as const;
  }

  if (file.size > MAX_ADVENTURE_IMAGE_SIZE) {
    return { error: "Adventure art must be 5 MB or smaller." } as const;
  }

  return { path: await convertImageFileToDataUrl(file) } as const;
}

async function requireAdventureModule(moduleId: string) {
  await requireAdminUser();

  const module = await prisma.adventureCatalog.findUnique({
    where: { id: moduleId },
    select: { id: true, adventureImagePath: true },
  });

  if (!module) {
    redirect("/admin/modules?module=missing");
  }

  return module;
}

async function requirePendingAdventureModule(pendingModuleId: string) {
  await requireAdminUser();

  const pendingModule = await prisma.pendingAdventureModule.findUnique({
    where: { id: pendingModuleId },
    select: { id: true, adventureImagePath: true },
  });

  if (!pendingModule) {
    redirect("/admin/modules?module=pending-missing");
  }

  return pendingModule;
}

function buildAdventureModuleFormSource(formData: FormData, moduleId = "") {
  const themes = String(formData.get("themes") ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  const contentAdvisories = String(formData.get("contentAdvisories") ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  return {
    moduleId: moduleId ?? "",
    adventureCode: String(formData.get("adventureCode") ?? ""),
    title: String(formData.get("title") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    duration: String(formData.get("duration") ?? ""),
    sourceSheet: String(formData.get("sourceSheet") ?? ""),
    gameSummary: serializeGameSummarySections({
      contentAdvisories,
      gameSummary: String(formData.get("gameSummaryText") ?? ""),
      themes,
    }),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    downtimeDaysAwarded: String(formData.get("downtimeDaysAwarded") ?? "0"),
    gold: String(formData.get("gold") ?? ""),
    spellbook: String(formData.get("spellbook") ?? ""),
    storyAwards: String(formData.get("storyAwards") ?? ""),
    sourceNotes: String(formData.get("sourceNotes") ?? ""),
    commonMagicItems: readStructuredMagicItems(formData, {
      flavorNotes: "moduleCommonMagicItemFlavors",
      items: "moduleCommonMagicItems",
      minorProperties: "moduleCommonMagicItemMinorProperties",
      names: "moduleCommonMagicItemNames",
    }),
    uncommonPlusMagicItems: readUncommonPlusMagicItems(formData),
    consumables: readStringListField(formData, "moduleConsumables"),
    boons: readStringListField(formData, "moduleBoons"),
    blessings: readStringListField(formData, "moduleBlessings"),
    charms: readStringListField(formData, "moduleCharms"),
    additionalMagicRewardNotes: String(formData.get("additionalMagicRewardNotes") ?? ""),
    additionalConsumableNotes: String(formData.get("additionalConsumableNotes") ?? ""),
  };
}

function buildPendingAdventureModuleFormSource(formData: FormData, pendingModuleId = "") {
  return {
    pendingModuleId: pendingModuleId ?? "",
    ...buildAdventureModuleFormSource(formData),
  };
}

export async function updateAdventureModule(formData: FormData) {
  const moduleId = String(formData.get("moduleId") ?? "");
  const parsed = updateAdventureModuleSchema.safeParse(
    buildAdventureModuleFormSource(formData, moduleId)
  );

  if (!parsed.success) {
    redirect("/admin/modules?module=invalid");
  }

  const module = await requireAdventureModule(parsed.data.moduleId);
  const lookupCode = normalizeAdventureLookupValue(parsed.data.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(parsed.data.title);

  if (!lookupCode || !lookupTitle) {
    redirect(`/admin/modules/${module.id}/edit?module=invalid`);
  }

  let adventureImagePath = module.adventureImagePath;
  const adventureImageFile = formData.get("adventureImage");

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      redirect(`/admin/modules/${module.id}/edit?module=image-invalid`);
    }

    adventureImagePath = uploadResult.path;
  }

  const splitMagicItems = splitUncommonPlusMagicItems(parsed.data.uncommonPlusMagicItems);

  try {
    await prisma.adventureCatalog.update({
      where: { id: module.id },
      data: {
        adventureCode: parsed.data.adventureCode,
        lookupCode,
        title: parsed.data.title,
        lookupTitle,
        tier: parsed.data.tier,
        duration: parsed.data.duration,
        gameSummary: parsed.data.gameSummary,
        adventureImagePath,
        serviceHours: parsed.data.serviceHours,
        downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        gold: parsed.data.gold,
        sourceSheet: parsed.data.sourceSheet,
        spellbook: parsed.data.spellbook,
        storyAwards: parsed.data.storyAwards,
        sourceNotes: parsed.data.sourceNotes,
        consumablesJson: serializeAdventureCatalogList(parsed.data.consumables),
        commonMagicItemsJson: serializeAdventureCatalogList(
          parsed.data.commonMagicItems.map(formatModuleMagicItemLine)
        ),
        uncommonMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uncommonMagicItems),
        rareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.rareMagicItems),
        veryRareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.veryRareMagicItems),
        legendaryMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.legendaryMagicItems),
        uniqueMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uniqueMagicItems),
        boonsJson: serializeAdventureCatalogList(parsed.data.boons),
        blessingsJson: serializeAdventureCatalogList(parsed.data.blessings),
        charmsJson: serializeAdventureCatalogList(parsed.data.charms),
        additionalMagicRewardNotes: parsed.data.additionalMagicRewardNotes,
        additionalConsumableNotes: parsed.data.additionalConsumableNotes,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(`/admin/modules/${module.id}/edit?module=conflict`);
    }

    throw error;
  }

  revalidatePath("/admin/modules");
  revalidatePath(`/admin/modules/${module.id}/edit`);
  redirect(`/admin/modules/${module.id}/edit?module=updated`);
}

export async function updatePendingAdventureModule(formData: FormData) {
  const pendingModuleId = String(formData.get("pendingModuleId") ?? "");
  const parsed = updateAdventureModuleSchema
    .omit({ moduleId: true })
    .extend({
      pendingModuleId: z.string().trim().min(1),
    })
    .safeParse(buildPendingAdventureModuleFormSource(formData, pendingModuleId));

  if (!parsed.success) {
    redirect("/admin/modules?module=pending-invalid");
  }

  const pendingModule = await requirePendingAdventureModule(parsed.data.pendingModuleId);
  const lookupCode = normalizeAdventureLookupValue(parsed.data.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(parsed.data.title);

  if (!lookupCode || !lookupTitle) {
    redirect(`/admin/modules/pending/${pendingModule.id}?module=invalid`);
  }

  let adventureImagePath = pendingModule.adventureImagePath;
  const adventureImageFile = formData.get("adventureImage");

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      redirect(`/admin/modules/pending/${pendingModule.id}?module=image-invalid`);
    }

    adventureImagePath = uploadResult.path;
  }

  const splitMagicItems = splitUncommonPlusMagicItems(parsed.data.uncommonPlusMagicItems);

  await prisma.pendingAdventureModule.update({
    where: { id: pendingModule.id },
    data: {
      adventureCode: parsed.data.adventureCode,
      lookupCode,
      title: parsed.data.title,
      lookupTitle,
      tier: parsed.data.tier,
      duration: parsed.data.duration,
      gameSummary: parsed.data.gameSummary,
      adventureImagePath,
      serviceHours: parsed.data.serviceHours,
      downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
      gold: parsed.data.gold,
      sourceSheet: parsed.data.sourceSheet,
      spellbook: parsed.data.spellbook,
      storyAwards: parsed.data.storyAwards,
      sourceNotes: parsed.data.sourceNotes,
      consumablesJson: serializeAdventureCatalogList(parsed.data.consumables),
      commonMagicItemsJson: serializeAdventureCatalogList(
        parsed.data.commonMagicItems.map(formatModuleMagicItemLine)
      ),
      uncommonMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uncommonMagicItems),
      rareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.rareMagicItems),
      veryRareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.veryRareMagicItems),
      legendaryMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.legendaryMagicItems),
      uniqueMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uniqueMagicItems),
      boonsJson: serializeAdventureCatalogList(parsed.data.boons),
      blessingsJson: serializeAdventureCatalogList(parsed.data.blessings),
      charmsJson: serializeAdventureCatalogList(parsed.data.charms),
      additionalMagicRewardNotes: parsed.data.additionalMagicRewardNotes,
      additionalConsumableNotes: parsed.data.additionalConsumableNotes,
    },
  });

  revalidatePath("/admin/modules");
  revalidatePath(`/admin/modules/pending/${pendingModule.id}`);
  redirect(`/admin/modules/pending/${pendingModule.id}?module=updated`);
}

export async function promotePendingAdventureModule(formData: FormData) {
  const pendingModuleId = String(formData.get("pendingModuleId") ?? "");
  const parsed = updateAdventureModuleSchema
    .omit({ moduleId: true })
    .extend({
      pendingModuleId: z.string().trim().min(1),
    })
    .safeParse(buildPendingAdventureModuleFormSource(formData, pendingModuleId));

  if (!parsed.success) {
    redirect("/admin/modules?module=pending-invalid");
  }

  const pendingModule = await requirePendingAdventureModule(parsed.data.pendingModuleId);
  const lookupCode = normalizeAdventureLookupValue(parsed.data.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(parsed.data.title);

  if (!lookupCode || !lookupTitle) {
    redirect(`/admin/modules/pending/${pendingModule.id}?module=invalid`);
  }

  let adventureImagePath = pendingModule.adventureImagePath;
  const adventureImageFile = formData.get("adventureImage");

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      redirect(`/admin/modules/pending/${pendingModule.id}?module=image-invalid`);
    }

    adventureImagePath = uploadResult.path;
  }

  const splitMagicItems = splitUncommonPlusMagicItems(parsed.data.uncommonPlusMagicItems);

  try {
    await prisma.$transaction([
      prisma.adventureCatalog.create({
        data: {
          adventureCode: parsed.data.adventureCode,
          lookupCode,
          title: parsed.data.title,
          lookupTitle,
          tier: parsed.data.tier,
          duration: parsed.data.duration,
          gameSummary: parsed.data.gameSummary,
          adventureImagePath,
          serviceHours: parsed.data.serviceHours,
          downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
          gold: parsed.data.gold,
          sourceSheet: parsed.data.sourceSheet,
          spellbook: parsed.data.spellbook,
          storyAwards: parsed.data.storyAwards,
          sourceNotes: parsed.data.sourceNotes,
          consumablesJson: serializeAdventureCatalogList(parsed.data.consumables),
          commonMagicItemsJson: serializeAdventureCatalogList(
            parsed.data.commonMagicItems.map(formatModuleMagicItemLine)
          ),
          uncommonMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uncommonMagicItems),
          rareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.rareMagicItems),
          veryRareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.veryRareMagicItems),
          legendaryMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.legendaryMagicItems),
          uniqueMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uniqueMagicItems),
          boonsJson: serializeAdventureCatalogList(parsed.data.boons),
          blessingsJson: serializeAdventureCatalogList(parsed.data.blessings),
          charmsJson: serializeAdventureCatalogList(parsed.data.charms),
          additionalMagicRewardNotes: parsed.data.additionalMagicRewardNotes,
          additionalConsumableNotes: parsed.data.additionalConsumableNotes,
        },
      }),
      prisma.pendingAdventureModule.delete({
        where: { id: pendingModule.id },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(`/admin/modules/pending/${pendingModule.id}?module=conflict`);
    }

    throw error;
  }

  revalidatePath("/admin/modules");
  revalidatePath(`/admin/modules/pending/${pendingModule.id}`);
  redirect("/admin/modules?module=pending-promoted");
}

export async function createAdventureModule(formData: FormData) {
  await requireAdminUser();

  const parsed = adventureModuleSchema.safeParse(buildAdventureModuleFormSource(formData));
  if (!parsed.success) {
    redirect("/admin/modules?module=invalid");
  }

  const lookupCode = normalizeAdventureLookupValue(parsed.data.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(parsed.data.title);

  if (!lookupCode || !lookupTitle) {
    redirect("/admin/modules?module=invalid");
  }

  let adventureImagePath: null | string = null;
  const adventureImageFile = formData.get("adventureImage");

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      redirect("/admin/modules?module=image-invalid");
    }

    adventureImagePath = uploadResult.path;
  }

  const splitMagicItems = splitUncommonPlusMagicItems(parsed.data.uncommonPlusMagicItems);

  try {
    await prisma.adventureCatalog.create({
      data: {
        adventureCode: parsed.data.adventureCode,
        lookupCode,
        title: parsed.data.title,
        lookupTitle,
        tier: parsed.data.tier,
        duration: parsed.data.duration,
        gameSummary: parsed.data.gameSummary,
        adventureImagePath,
        serviceHours: parsed.data.serviceHours,
        downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        gold: parsed.data.gold,
        sourceSheet: parsed.data.sourceSheet,
        spellbook: parsed.data.spellbook,
        storyAwards: parsed.data.storyAwards,
        sourceNotes: parsed.data.sourceNotes,
        consumablesJson: serializeAdventureCatalogList(parsed.data.consumables),
        commonMagicItemsJson: serializeAdventureCatalogList(
          parsed.data.commonMagicItems.map(formatModuleMagicItemLine)
        ),
        uncommonMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uncommonMagicItems),
        rareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.rareMagicItems),
        veryRareMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.veryRareMagicItems),
        legendaryMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.legendaryMagicItems),
        uniqueMagicItemsJson: serializeAdventureCatalogList(splitMagicItems.uniqueMagicItems),
        boonsJson: serializeAdventureCatalogList(parsed.data.boons),
        blessingsJson: serializeAdventureCatalogList(parsed.data.blessings),
        charmsJson: serializeAdventureCatalogList(parsed.data.charms),
        additionalMagicRewardNotes: parsed.data.additionalMagicRewardNotes,
        additionalConsumableNotes: parsed.data.additionalConsumableNotes,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect("/admin/modules?module=conflict");
    }

    throw error;
  }

  revalidatePath("/admin/modules");
  redirect("/admin/modules?module=created");
}
