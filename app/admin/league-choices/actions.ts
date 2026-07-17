"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DND_CLASSES,
  type LegalSubclassOptionsMap,
  normalizeLeagueChoiceValues,
} from "@/lib/character-options";
import { requireAdminUser } from "@/lib/admin";
import {
  MAGIC_ITEM_RARITIES,
  type LegalBlessingOptions,
  type LegalBoonOptions,
  type LegalCharmOptions,
  type LegalConsumableOptions,
  type LegalFeatOptions,
  type LegalLanguageOptions,
  type LegalMagicItemOptionsMap,
  type LegalToolOptions,
  updateLeagueLegalBlessingOptions,
  updateLeagueLegalBoonOptions,
  updateLeagueLegalCharmOptions,
  updateLeagueLegalConsumableOptions,
  updateLeagueLegalFeatOptions,
  updateLeagueLegalLanguageOptions,
  updateLeagueLegalMagicItemOptions,
  updateLeagueLegalSubclassOptions,
  updateLeagueLegalToolOptions,
} from "@/lib/league-legal-choices";

export async function updateLeagueLegalChoices(formData: FormData) {
  await requireAdminUser();

  const nextOptions = Object.fromEntries(
    DND_CLASSES.map((className) => [
      className,
      normalizeLeagueChoiceValues(
        String(formData.get(`subclasses:${className}`) ?? "")
          .split(/\r?\n/)
      ),
    ])
  ) as LegalSubclassOptionsMap;

  const nextMagicItemOptions = Object.fromEntries(
    MAGIC_ITEM_RARITIES.map((rarity) => [
      rarity,
      normalizeLeagueChoiceValues(
        String(formData.get(`magic-items:${rarity}`) ?? "")
          .split(/\r?\n/)
      ),
    ])
  ) as LegalMagicItemOptionsMap;

  const nextConsumableOptions = normalizeLeagueChoiceValues(
    String(formData.get("consumables") ?? "")
      .split(/\r?\n/)
  ) as LegalConsumableOptions;

  const nextFeatOptions = normalizeLeagueChoiceValues(
    String(formData.get("feats") ?? "")
      .split(/\r?\n/)
  ) as LegalFeatOptions;

  const nextToolOptions = normalizeLeagueChoiceValues(
    String(formData.get("tools") ?? "")
      .split(/\r?\n/)
  ) as LegalToolOptions;

  const nextLanguageOptions = normalizeLeagueChoiceValues(
    String(formData.get("languages") ?? "")
      .split(/\r?\n/)
  ) as LegalLanguageOptions;

  const nextBoonOptions = normalizeLeagueChoiceValues(
    String(formData.get("boons") ?? "")
      .split(/\r?\n/)
  ) as LegalBoonOptions;

  const nextBlessingOptions = normalizeLeagueChoiceValues(
    String(formData.get("blessings") ?? "")
      .split(/\r?\n/)
  ) as LegalBlessingOptions;

  const nextCharmOptions = normalizeLeagueChoiceValues(
    String(formData.get("charms") ?? "")
      .split(/\r?\n/)
  ) as LegalCharmOptions;

  await updateLeagueLegalSubclassOptions(nextOptions);
  await updateLeagueLegalMagicItemOptions(nextMagicItemOptions);
  await updateLeagueLegalConsumableOptions(nextConsumableOptions);
  await updateLeagueLegalFeatOptions(nextFeatOptions);
  await updateLeagueLegalToolOptions(nextToolOptions);
  await updateLeagueLegalLanguageOptions(nextLanguageOptions);
  await updateLeagueLegalBoonOptions(nextBoonOptions);
  await updateLeagueLegalBlessingOptions(nextBlessingOptions);
  await updateLeagueLegalCharmOptions(nextCharmOptions);

  revalidatePath("/admin/league-choices");
  revalidatePath("/admin/users");
  revalidatePath("/player/characters/new");
  revalidatePath("/player/characters/[id]/edit", "page");

  redirect("/admin/league-choices?choices=saved");
}
