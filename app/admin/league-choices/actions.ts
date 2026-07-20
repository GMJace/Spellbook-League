"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DND_CLASSES,
  type LegalSubclassOptionsMap,
  normalizeLeagueChoiceValues,
} from "@/lib/character-options";
import { requireLeagueChoicesAdminUser } from "@/lib/admin";
import {
  MAGIC_ITEM_RARITIES,
  type LegalBlessingOptions,
  type LegalBoonOptions,
  type LegalCharmOptions,
  type LegalConsumableOptions,
  type LegalMagicItemOptionsMap,
  type LegalMinorPropertyOptions,
  getLeagueLegalFeatSections,
  getLeagueLegalLanguageSections,
  getLeagueLegalToolSections,
  updateLeagueLegalBlessingOptions,
  updateLeagueLegalBoonOptions,
  updateLeagueLegalCharmOptions,
  updateLeagueLegalConsumableOptions,
  updateLeagueLegalFeatSections,
  updateLeagueLegalLanguageSections,
  updateLeagueLegalMagicItemOptions,
  updateLeagueLegalMinorPropertyOptions,
  updateLeagueLegalSubclassOptions,
  updateLeagueLegalToolSections,
} from "@/lib/league-legal-choices";

function parseHeaderTextareaSections(value: string) {
  const parsedSections: Array<{ title?: string; values: string[] }> = [];
  let currentSection: { title?: string; values: string[] } | null = null;

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.toLowerCase().startsWith("header:")) {
      if (currentSection) {
        parsedSections.push(currentSection);
      }

      currentSection = {
        title: line.slice("header:".length).trim(),
        values: [],
      };
      continue;
    }

    if (!currentSection) {
      currentSection = {
        values: [],
      };
    }

    currentSection.values.push(line);
  }

  if (currentSection) {
    parsedSections.push(currentSection);
  }

  return parsedSections;
}

function mergeParsedSectionsIntoTemplate<
  TSection extends {
    key: string;
    title: string;
    note?: string;
    values: string[];
  },
>(templateSections: TSection[], value: string) {
  const parsedSections = parseHeaderTextareaSections(value);

  return templateSections.map((section, index) => ({
    ...section,
    title: parsedSections[index]?.title?.trim() || section.title,
    values: normalizeLeagueChoiceValues(parsedSections[index]?.values ?? []),
  }));
}

export async function updateLeagueLegalChoices(formData: FormData) {
  await requireLeagueChoicesAdminUser();

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

  const [currentFeatSections, currentToolSections, currentLanguageSections] =
    await Promise.all([
      getLeagueLegalFeatSections(),
      getLeagueLegalToolSections(),
      getLeagueLegalLanguageSections(),
    ]);

  const nextFeatSections = mergeParsedSectionsIntoTemplate(
    currentFeatSections,
    String(formData.get("feats") ?? "")
  );

  const nextToolSections = mergeParsedSectionsIntoTemplate(
    currentToolSections,
    String(formData.get("tools") ?? "")
  );

  const nextLanguageSections = mergeParsedSectionsIntoTemplate(
    currentLanguageSections,
    String(formData.get("languages") ?? "")
  );

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

  const nextMinorPropertyOptions = normalizeLeagueChoiceValues(
    String(formData.get("minorProperties") ?? "")
      .split(/\r?\n/)
  ) as LegalMinorPropertyOptions;

  await updateLeagueLegalSubclassOptions(nextOptions);
  await updateLeagueLegalMagicItemOptions(nextMagicItemOptions);
  await updateLeagueLegalConsumableOptions(nextConsumableOptions);
  await updateLeagueLegalFeatSections(nextFeatSections);
  await updateLeagueLegalToolSections(nextToolSections);
  await updateLeagueLegalLanguageSections(nextLanguageSections);
  await updateLeagueLegalBoonOptions(nextBoonOptions);
  await updateLeagueLegalBlessingOptions(nextBlessingOptions);
  await updateLeagueLegalCharmOptions(nextCharmOptions);
  await updateLeagueLegalMinorPropertyOptions(nextMinorPropertyOptions);

  revalidatePath("/admin/league-choices");
  revalidatePath("/admin/users");
  revalidatePath("/player/characters/new");
  revalidatePath("/player/characters/[id]/edit", "page");

  redirect("/admin/league-choices?choices=saved");
}
