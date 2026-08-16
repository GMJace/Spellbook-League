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
import { prisma } from "@/lib/prisma";

const adventureModuleSchema = z.object({
  moduleId: z.string().trim().min(1),
  adventureCode: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  duration: z.string().trim().max(80).default(""),
  gold: z.string().trim().max(240).default(""),
  pageNumbers: z.string().trim().max(240).default(""),
  sourceSheet: z.string().trim().max(160).default(""),
  spellbook: z.string().trim().max(2000).default(""),
  storyAwards: z.string().trim().max(4000).default(""),
  sourceNotes: z.string().trim().max(4000).default(""),
  consumables: z.string().max(4000).default(""),
  commonMagicItems: z.string().max(4000).default(""),
  uncommonMagicItems: z.string().max(4000).default(""),
  rareMagicItems: z.string().max(4000).default(""),
  veryRareMagicItems: z.string().max(4000).default(""),
  legendaryMagicItems: z.string().max(4000).default(""),
  uniqueMagicItems: z.string().max(4000).default(""),
});

async function requireAdventureModule(moduleId: string) {
  await requireAdminUser();

  const module = await prisma.adventureCatalog.findUnique({
    where: { id: moduleId },
    select: { id: true },
  });

  if (!module) {
    redirect("/admin/modules?module=invalid");
  }

  return module;
}

export async function updateAdventureModule(formData: FormData) {
  const parsed = adventureModuleSchema.safeParse({
    moduleId: String(formData.get("moduleId") ?? ""),
    adventureCode: String(formData.get("adventureCode") ?? ""),
    title: String(formData.get("title") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    duration: String(formData.get("duration") ?? ""),
    gold: String(formData.get("gold") ?? ""),
    pageNumbers: String(formData.get("pageNumbers") ?? ""),
    sourceSheet: String(formData.get("sourceSheet") ?? ""),
    spellbook: String(formData.get("spellbook") ?? ""),
    storyAwards: String(formData.get("storyAwards") ?? ""),
    sourceNotes: String(formData.get("sourceNotes") ?? ""),
    consumables: String(formData.get("consumables") ?? ""),
    commonMagicItems: String(formData.get("commonMagicItems") ?? ""),
    uncommonMagicItems: String(formData.get("uncommonMagicItems") ?? ""),
    rareMagicItems: String(formData.get("rareMagicItems") ?? ""),
    veryRareMagicItems: String(formData.get("veryRareMagicItems") ?? ""),
    legendaryMagicItems: String(formData.get("legendaryMagicItems") ?? ""),
    uniqueMagicItems: String(formData.get("uniqueMagicItems") ?? ""),
  });

  if (!parsed.success) {
    redirect("/admin/modules?module=invalid");
  }

  const module = await requireAdventureModule(parsed.data.moduleId);
  const lookupCode = normalizeAdventureLookupValue(parsed.data.adventureCode);
  const lookupTitle = normalizeAdventureLookupValue(parsed.data.title);

  if (!lookupCode || !lookupTitle) {
    redirect(`/admin/modules/${module.id}/edit?module=invalid`);
  }

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
        gold: parsed.data.gold,
        pageNumbers: parsed.data.pageNumbers,
        sourceSheet: parsed.data.sourceSheet,
        spellbook: parsed.data.spellbook,
        storyAwards: parsed.data.storyAwards,
        sourceNotes: parsed.data.sourceNotes,
        consumablesJson: serializeAdventureCatalogList(parsed.data.consumables),
        commonMagicItemsJson: serializeAdventureCatalogList(parsed.data.commonMagicItems),
        uncommonMagicItemsJson: serializeAdventureCatalogList(parsed.data.uncommonMagicItems),
        rareMagicItemsJson: serializeAdventureCatalogList(parsed.data.rareMagicItems),
        veryRareMagicItemsJson: serializeAdventureCatalogList(parsed.data.veryRareMagicItems),
        legendaryMagicItemsJson: serializeAdventureCatalogList(parsed.data.legendaryMagicItems),
        uniqueMagicItemsJson: serializeAdventureCatalogList(parsed.data.uniqueMagicItems),
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
