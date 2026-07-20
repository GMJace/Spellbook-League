"use server";

import { redirect } from "next/navigation";
import {
  getCharmSlotCount,
  getCharacterTier,
  getConsumableItemLimit,
  getMagicItemLimit,
  hasBoonSlot,
} from "@/lib/character";
import { requireRole } from "@/lib/auth";
import {
  getCharacterLimitForRoles,
} from "@/lib/character-limits";
import {
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getCharacterBuildMagicItemOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalFeatOptions,
  getLeagueLegalLanguageOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalSubclassOptions,
  getLeagueLegalToolOptions,
} from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";
import {
  getTokenImageUpload,
  saveTokenImageUpload,
} from "@/lib/token-upload";
import {
  characterSchema,
  getCharacterValidationMessage,
  validateCharacterChoices,
} from "@/lib/validation";

function redirectWithCharacterError(
  path: string,
  message: string,
  error = "validation"
): never {
  const searchParams = new URLSearchParams({ error, message });
  redirect(`${path}?${searchParams.toString()}`);
}

export async function createCharacter(
  formData: FormData
) {
  const user = await requireRole("PLAYER");
  const characterLimit = getCharacterLimitForRoles(user.roles);
  const existingCharacterCount = await prisma.character.count({
    where: {
      userId: user.id,
    },
  });

  if (existingCharacterCount >= characterLimit) {
    redirect(`/player?characterLimit=reached&limit=${characterLimit}`);
  }

  const tokenImageFile = getTokenImageUpload(formData.get("tokenImage"));
  const [
    legalSubclassOptions,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalFeatOptions,
    legalToolOptions,
    legalLanguageOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  ] = await Promise.all([
    getLeagueLegalSubclassOptions(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalFeatOptions(),
    getLeagueLegalToolOptions(),
    getLeagueLegalLanguageOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
  ]);
  const parsed = characterSchema.safeParse({
    name: formData.get("name"),
    characterSheetLink: formData.get("characterSheetLink"),
    armorClass: formData.get("armorClass"),
    spellSaveDc: formData.get("spellSaveDc"),
    class1Name: formData.get("class1Name"),
    class1Subclass: formData.get("class1Subclass"),
    class1Level: formData.get("class1Level"),
    class2Name: formData.get("class2Name"),
    class2Subclass: formData.get("class2Subclass"),
    class2Level: formData.get("class2Level"),
    class3Name: formData.get("class3Name"),
    class3Subclass: formData.get("class3Subclass"),
    class3Level: formData.get("class3Level"),
    feats: formData.get("feats"),
    proficiencies: formData.get("proficiencies"),
    tools: formData.get("tools"),
    languages: formData.get("languages"),
    notes: formData.get("notes"),
    backstory: formData.get("backstory"),
    totalGold: formData.get("totalGold"),
    magicItems: formData
      .getAll("magicItems")
      .map((value) => String(value).trim())
      .filter(Boolean),
    commonMagicItems: formData
      .getAll("commonMagicItems")
      .map((value) => String(value).trim())
      .filter(Boolean),
    consumables: formData
      .getAll("consumables")
      .map((value) => String(value).trim())
      .filter(Boolean),
    boon: formData.get("boon"),
    blessing: formData.get("blessing"),
    charms: formData
      .getAll("charms")
      .map((value) => String(value).trim())
      .filter(Boolean),
  });

  if (!parsed.success) {
    redirectWithCharacterError(
      "/player/characters/new",
      getCharacterValidationMessage(parsed.error)
    );
  }

  const characterChoiceValidation = validateCharacterChoices(parsed.data, {
    legalSubclassOptions,
    legalFeatOptions,
    legalToolOptions,
    legalLanguageOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  });

  if (!characterChoiceValidation.success) {
    redirectWithCharacterError(
      "/player/characters/new",
      characterChoiceValidation.message ?? "Review the selected class subclasses and try again."
    );
  }

  const totalLevel =
    parsed.data.class1Level + parsed.data.class2Level + parsed.data.class3Level;
  const tier = getCharacterTier(totalLevel);
  const magicItemLimit = getMagicItemLimit(tier);
  const consumableItemLimit = getConsumableItemLimit(tier);
  const boonAllowed = hasBoonSlot(tier);
  const charmSlotCount = getCharmSlotCount(tier);

  if (parsed.data.magicItems.length > magicItemLimit) {
    redirectWithCharacterError(
      "/player/characters/new",
      `Tier ${tier} characters can only have ${magicItemLimit} current build magic item slot${magicItemLimit === 1 ? "" : "s"} filled.`
    );
  }

  const legalBuildMagicItemSet = new Set(
    getCharacterBuildMagicItemOptions(legalMagicItemOptions)
  );
  const invalidBuildMagicItem = parsed.data.magicItems.find(
    (item) => !legalBuildMagicItemSet.has(item)
  );

  if (invalidBuildMagicItem) {
    redirectWithCharacterError(
      "/player/characters/new",
      `"${invalidBuildMagicItem}" is not in the legal Uncommon+ magic items list.`
    );
  }

  const legalCommonMagicItemSet = new Set(legalMagicItemOptions.Common);
  const invalidCommonMagicItem = parsed.data.commonMagicItems.find(
    (item) => !legalCommonMagicItemSet.has(item)
  );

  if (invalidCommonMagicItem) {
    redirectWithCharacterError(
      "/player/characters/new",
      `"${invalidCommonMagicItem}" is not in the Common legal magic items list.`
    );
  }

  const legalConsumableSet = new Set(legalConsumableOptions);
  const invalidConsumable = parsed.data.consumables.find((item) => !legalConsumableSet.has(item));

  if (invalidConsumable) {
    redirectWithCharacterError(
      "/player/characters/new",
      `"${invalidConsumable}" is not in the legal consumables list.`
    );
  }

  if (parsed.data.consumables.length > consumableItemLimit) {
    redirectWithCharacterError(
      "/player/characters/new",
      `Tier ${tier} characters can only have ${consumableItemLimit} consumable slots filled.`
    );
  }

  if ((parsed.data.boon && !boonAllowed) || parsed.data.charms.length > charmSlotCount) {
    if (parsed.data.boon && !boonAllowed) {
      redirectWithCharacterError(
        "/player/characters/new",
        "Only tier 4 characters can have a boon slot filled."
      );
    }

    redirectWithCharacterError(
      "/player/characters/new",
      `Tier ${tier} characters can only have ${charmSlotCount} charm slots filled.`
    );
  }

  let tokenImagePath: string | null = null;

  if (tokenImageFile) {
    try {
      tokenImagePath = await saveTokenImageUpload(tokenImageFile);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Token images must be 5 MB or smaller."
      ) {
        redirectWithCharacterError("/player/characters/new", error.message);
      }

      redirectWithCharacterError(
        "/player/characters/new",
        "Upload a PNG, JPG, WEBP, or GIF token image."
      );
    }
  }

  const character = await prisma.character.create({
    data: {
      name: parsed.data.name,
      userId: user.id,
      characterSheetLink: parsed.data.characterSheetLink || null,
      armorClass: parsed.data.armorClass ?? null,
      spellSaveDc: parsed.data.spellSaveDc ?? null,
      tokenImagePath,
      class1Name: parsed.data.class1Name,
      class1Subclass: parsed.data.class1Subclass || null,
      class1Level: parsed.data.class1Level,
      class2Name: parsed.data.class2Name || null,
      class2Subclass: parsed.data.class2Name ? parsed.data.class2Subclass || null : null,
      class2Level: parsed.data.class2Name ? parsed.data.class2Level : null,
      class3Name: parsed.data.class3Name || null,
      class3Subclass: parsed.data.class3Name ? parsed.data.class3Subclass || null : null,
      class3Level: parsed.data.class3Name ? parsed.data.class3Level : null,
      feats: parsed.data.feats || "",
      proficiencies: parsed.data.proficiencies || "",
      tools: parsed.data.tools || "",
      languages: parsed.data.languages || "",
      notes: parsed.data.notes || "",
      backstory: parsed.data.backstory || "",
      totalGold: parsed.data.totalGold,
      magicItems: JSON.stringify(parsed.data.magicItems),
      commonMagicItems: JSON.stringify(parsed.data.commonMagicItems),
      consumables: JSON.stringify(parsed.data.consumables),
      boon: parsed.data.boon || "",
      blessing: parsed.data.blessing || "",
      charms: JSON.stringify(parsed.data.charms),
    },
  });

  redirect(`/player/characters/${character.id}/edit?created=1`);
}
