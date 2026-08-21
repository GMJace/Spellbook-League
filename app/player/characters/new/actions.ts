"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getCharmSlotCount,
  getCharacterTier,
  getConsumableItemLimit,
  getMagicItemLimit,
  hasBoonSlot,
  serializeMagicItemFlavorDetails,
} from "@/lib/character";
import { requireRole } from "@/lib/auth";
import {
  buildImportedCharacterRow,
  isMeaningfulCharacterLogsheetRow,
  normalizeCharacterLogsheetHeader,
} from "@/lib/character-logsheet-import";
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
  getLeagueLegalMinorPropertyOptions,
  getLeagueLegalSubclassOptions,
  getLeagueLegalToolOptions,
} from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";
import { parseUploadedTabularFile } from "@/lib/tabular-import";
import {
  getTokenImageUpload,
  saveTokenImageUpload,
} from "@/lib/token-upload";
import {
  characterSchema,
  getCharacterValidationMessage,
  validateCharacterChoices,
} from "@/lib/validation";

const MAX_CHARACTER_LOGSHEET_IMPORT_SIZE = 2 * 1024 * 1024;
const REQUIRED_CHARACTER_IMPORT_HEADERS = [
  "Character Name",
  "Class 1",
  "Class 1 Level",
  "Total Gold",
] as const;

function redirectWithCharacterError(
  path: string,
  message: string,
  error = "validation"
): never {
  const searchParams = new URLSearchParams({ error, message });
  redirect(`${path}?${searchParams.toString()}`);
}

function getSubmittedSlotSelections(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => String(value).trim());
}

function compressSlottedSelections(
  items: string[],
  names: string[],
  details: string[],
  flavors: string[],
) {
  const nextItems: string[] = [];
  const nextNames: string[] = [];
  const nextDetails: string[] = [];
  const nextFlavors: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] ?? "";

    if (!item) {
      continue;
    }

    nextItems.push(item);
    nextNames.push(names[index] ?? "");
    nextDetails.push(details[index] ?? "");
    nextFlavors.push(flavors[index] ?? "");
  }

  return {
    items: nextItems,
    names: nextNames,
    details: nextDetails,
    flavors: nextFlavors,
  };
}

type CharacterInput = z.infer<typeof characterSchema>;

async function getCharacterValidationResources() {
  const [
    legalSubclassOptions,
    legalMagicItemOptions,
    legalMinorPropertyOptions,
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
    getLeagueLegalMinorPropertyOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalFeatOptions(),
    getLeagueLegalToolOptions(),
    getLeagueLegalLanguageOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
  ]);

  return {
    legalSubclassOptions,
    legalMagicItemOptions,
    legalMinorPropertyOptions,
    legalConsumableOptions,
    legalFeatOptions,
    legalToolOptions,
    legalLanguageOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalBuildMagicItemOptions: getCharacterBuildMagicItemOptions(legalMagicItemOptions),
  };
}

type CharacterValidationResources = Awaited<ReturnType<typeof getCharacterValidationResources>>;

async function ensureCharacterCapacity(
  user: { id: string; roles: Array<string> },
  requestedCount: number,
  path: string,
) {
  const characterLimit = getCharacterLimitForRoles(user.roles as Array<"PLAYER" | "DM" | "PATRON">);
  const existingCharacterCount = await prisma.character.count({
    where: {
      userId: user.id,
    },
  });

  if (existingCharacterCount >= characterLimit) {
    redirect(`/player?characterLimit=reached&limit=${characterLimit}`);
  }

  const remainingSlots = characterLimit - existingCharacterCount;

  if (requestedCount > remainingSlots) {
    redirectWithCharacterError(
      path,
      `You can import ${remainingSlots} more character logsheet${remainingSlots === 1 ? "" : "s"} before reaching your limit.`,
      "import",
    );
  }
}

function validateAndBuildCharacterCreateData({
  input,
  errorType = "validation",
  isPubliclyViewable,
  messagePrefix = "",
  path,
  resources,
  tokenImagePath,
}: {
  input: CharacterInput | Record<string, unknown>;
  errorType?: string;
  isPubliclyViewable: boolean;
  messagePrefix?: string;
  path: string;
  resources: CharacterValidationResources;
  tokenImagePath: string | null;
}) {
  const withPrefix = (message: string) => `${messagePrefix}${message}`;
  const parsed = characterSchema.safeParse(input);

  if (!parsed.success) {
    redirectWithCharacterError(path, withPrefix(getCharacterValidationMessage(parsed.error)), errorType);
  }

  const characterChoiceValidation = validateCharacterChoices(parsed.data, {
    legalSubclassOptions: resources.legalSubclassOptions,
    legalFeatOptions: resources.legalFeatOptions,
    legalToolOptions: resources.legalToolOptions,
    legalLanguageOptions: resources.legalLanguageOptions,
    legalBoonOptions: resources.legalBoonOptions,
    legalBlessingOptions: resources.legalBlessingOptions,
    legalCharmOptions: resources.legalCharmOptions,
  });

  if (!characterChoiceValidation.success) {
    redirectWithCharacterError(
      path,
      withPrefix(
        characterChoiceValidation.message ?? "Review the selected class subclasses and try again."
      ),
      errorType,
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
      path,
      withPrefix(
        `Tier ${tier} characters can only have ${magicItemLimit} current build magic item slot${magicItemLimit === 1 ? "" : "s"} filled.`
      ),
      errorType,
    );
  }

  const legalBuildMagicItemSet = new Set(resources.legalBuildMagicItemOptions);
  const legalMinorPropertySet = new Set(resources.legalMinorPropertyOptions);
  const invalidBuildMagicItem = parsed.data.magicItems.find(
    (item) => !legalBuildMagicItemSet.has(item)
  );

  if (invalidBuildMagicItem) {
    redirectWithCharacterError(
      path,
      withPrefix(`"${invalidBuildMagicItem}" is not in the legal Uncommon+ magic items list.`),
      errorType,
    );
  }

  const legalCommonMagicItemSet = new Set(resources.legalMagicItemOptions.Common);
  const invalidCommonMagicItem = parsed.data.commonMagicItems.find(
    (item) => !legalCommonMagicItemSet.has(item)
  );

  if (invalidCommonMagicItem) {
    redirectWithCharacterError(
      path,
      withPrefix(`"${invalidCommonMagicItem}" is not in the Common legal magic items list.`),
      errorType,
    );
  }

  const invalidBuildMinorProperty = parsed.data.magicItemMinorProperties.find(
    (minorProperty, index) =>
      minorProperty &&
      legalBuildMagicItemSet.has(parsed.data.magicItems[index]) &&
      !legalMinorPropertySet.has(minorProperty)
  );

  if (invalidBuildMinorProperty) {
    redirectWithCharacterError(
      path,
      withPrefix(`"${invalidBuildMinorProperty}" is not in the Minor Properties list.`),
      errorType,
    );
  }

  const invalidCommonMinorProperty = parsed.data.commonMagicItemMinorProperties.find(
    (minorProperty) => minorProperty && !legalMinorPropertySet.has(minorProperty)
  );

  if (invalidCommonMinorProperty) {
    redirectWithCharacterError(
      path,
      withPrefix(`"${invalidCommonMinorProperty}" is not in the Minor Properties list.`),
      errorType,
    );
  }

  const normalizedMagicItemMinorProperties = parsed.data.magicItems.map((item, index) => {
    const minorProperty = parsed.data.magicItemMinorProperties[index] ?? "";

    return legalBuildMagicItemSet.has(item) && legalMinorPropertySet.has(minorProperty)
      ? minorProperty
      : "";
  });

  const normalizedCommonMagicItemMinorProperties = parsed.data.commonMagicItems.map(
    (_, index) => {
      const minorProperty = parsed.data.commonMagicItemMinorProperties[index] ?? "";

      return legalMinorPropertySet.has(minorProperty) ? minorProperty : "";
    }
  );
  const normalizedMagicItemFlavors = parsed.data.magicItems.map((item, index) => ({
    name: parsed.data.magicItemNames[index] ?? "",
    notes: legalBuildMagicItemSet.has(item) ? parsed.data.magicItemFlavors[index] ?? "" : "",
  }));
  const normalizedCommonMagicItemFlavors = parsed.data.commonMagicItems.map(
    (_, index) => ({
      name: parsed.data.commonMagicItemNames[index] ?? "",
      notes: parsed.data.commonMagicItemFlavors[index] ?? "",
    })
  );

  const legalConsumableSet = new Set(resources.legalConsumableOptions);
  const invalidConsumable = parsed.data.consumables.find((item) => !legalConsumableSet.has(item));

  if (invalidConsumable) {
    redirectWithCharacterError(
      path,
      withPrefix(`"${invalidConsumable}" is not in the legal consumables list.`),
      errorType,
    );
  }

  if (parsed.data.consumables.length > consumableItemLimit) {
    redirectWithCharacterError(
      path,
      withPrefix(
        `Tier ${tier} characters can only have ${consumableItemLimit} consumable slots filled.`
      ),
      errorType,
    );
  }

  if ((parsed.data.boon && !boonAllowed) || parsed.data.charms.length > charmSlotCount) {
    if (parsed.data.boon && !boonAllowed) {
      redirectWithCharacterError(
        path,
        withPrefix("Only tier 4 characters can have a boon slot filled."),
        errorType,
      );
    }

    redirectWithCharacterError(
      path,
      withPrefix(`Tier ${tier} characters can only have ${charmSlotCount} charm slots filled.`),
      errorType,
    );
  }

  return {
    isPubliclyViewable,
    characterSheetLink: parsed.data.characterSheetLink || null,
    hitPoints: parsed.data.hitPoints ?? null,
    armorClass: parsed.data.armorClass ?? null,
    passivePerception: parsed.data.passivePerception ?? null,
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
    magicItemMinorProperties: JSON.stringify(normalizedMagicItemMinorProperties),
    magicItemFlavors: serializeMagicItemFlavorDetails(normalizedMagicItemFlavors),
    commonMagicItems: JSON.stringify(parsed.data.commonMagicItems),
    commonMagicItemMinorProperties: JSON.stringify(
      normalizedCommonMagicItemMinorProperties
    ),
    commonMagicItemFlavors: serializeMagicItemFlavorDetails(
      normalizedCommonMagicItemFlavors
    ),
    consumables: JSON.stringify(parsed.data.consumables),
    boon: parsed.data.boon || "",
    blessing: parsed.data.blessing || "",
    charms: JSON.stringify(parsed.data.charms),
    name: parsed.data.name,
  };
}

export async function createCharacter(
  formData: FormData
) {
  const user = await requireRole("PLAYER");
  await ensureCharacterCapacity(user, 1, "/player/characters/new");

  const tokenImageFile = getTokenImageUpload(formData.get("tokenImage"));
  const isPubliclyViewable = formData.get("isPubliclyViewable") === "true";
  const resources = await getCharacterValidationResources();
  const submittedMagicItems = getSubmittedSlotSelections(formData, "magicItems");
  const submittedMagicItemNames = getSubmittedSlotSelections(formData, "magicItemNames");
  const submittedMagicItemMinorProperties = getSubmittedSlotSelections(
    formData,
    "magicItemMinorProperties"
  );
  const submittedMagicItemFlavors = getSubmittedSlotSelections(formData, "magicItemFlavors");
  const submittedCommonMagicItems = getSubmittedSlotSelections(formData, "commonMagicItems");
  const submittedCommonMagicItemNames = getSubmittedSlotSelections(
    formData,
    "commonMagicItemNames"
  );
  const submittedCommonMagicItemMinorProperties = getSubmittedSlotSelections(
    formData,
    "commonMagicItemMinorProperties"
  );
  const submittedCommonMagicItemFlavors = getSubmittedSlotSelections(
    formData,
    "commonMagicItemFlavors"
  );
  const compressedMagicItemSelections = compressSlottedSelections(
    submittedMagicItems,
    submittedMagicItemNames,
    submittedMagicItemMinorProperties,
    submittedMagicItemFlavors
  );
  const compressedCommonMagicItemSelections = compressSlottedSelections(
    submittedCommonMagicItems,
    submittedCommonMagicItemNames,
    submittedCommonMagicItemMinorProperties,
    submittedCommonMagicItemFlavors
  );

  const characterInput = {
    name: formData.get("name"),
    characterSheetLink: formData.get("characterSheetLink"),
    hitPoints: formData.get("hitPoints"),
    armorClass: formData.get("armorClass"),
    passivePerception: formData.get("passivePerception"),
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
    magicItems: compressedMagicItemSelections.items,
    magicItemNames: compressedMagicItemSelections.names,
    magicItemMinorProperties: compressedMagicItemSelections.details,
    magicItemFlavors: compressedMagicItemSelections.flavors,
    commonMagicItems: compressedCommonMagicItemSelections.items,
    commonMagicItemNames: compressedCommonMagicItemSelections.names,
    commonMagicItemMinorProperties: compressedCommonMagicItemSelections.details,
    commonMagicItemFlavors: compressedCommonMagicItemSelections.flavors,
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
  };

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

  const createData = validateAndBuildCharacterCreateData({
    input: characterInput,
    errorType: "validation",
    isPubliclyViewable,
    path: "/player/characters/new",
    resources,
    tokenImagePath,
  });

  const character = await prisma.character.create({
    data: {
      userId: user.id,
      ...createData,
    },
  });

  revalidatePath("/");
  revalidatePath("/dm/players");
  revalidatePath("/dm/achievements");

  redirect(`/player/characters/${character.id}/edit?created=1`);
}

export async function importCharacterLogsheet(formData: FormData) {
  const user = await requireRole("PLAYER");
  const file = formData.get("characterLogsheetFile");

  if (!(file instanceof File) || file.size <= 0) {
    redirectWithCharacterError(
      "/player/characters/new",
      "Choose a completed character logsheet spreadsheet before importing.",
      "import",
    );
  }

  if (file.size > MAX_CHARACTER_LOGSHEET_IMPORT_SIZE) {
    redirectWithCharacterError(
      "/player/characters/new",
      "That file is too large. Please keep it under 2 MB.",
      "import",
    );
  }

  const lowerFileName = file.name.toLowerCase();

  if (!lowerFileName.endsWith(".csv") && !lowerFileName.endsWith(".xlsx")) {
    redirectWithCharacterError(
      "/player/characters/new",
      "Please upload the completed CSV or XLSX character template.",
      "import",
    );
  }

  const rows = await parseUploadedTabularFile(file);

  if (!rows.length) {
    redirectWithCharacterError(
      "/player/characters/new",
      "That file did not include any rows to import.",
      "import",
    );
  }

  const normalizedHeaders = rows[0].map((value) => normalizeCharacterLogsheetHeader(value));
  const missingHeaders = REQUIRED_CHARACTER_IMPORT_HEADERS.filter((header) =>
    !normalizedHeaders.includes(normalizeCharacterLogsheetHeader(header)),
  );

  if (missingHeaders.length) {
    redirectWithCharacterError(
      "/player/characters/new",
      `The uploaded file is missing required columns: ${missingHeaders.join(", ")}.`,
      "import",
    );
  }

  const resources = await getCharacterValidationResources();
  const meaningfulRows = rows
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => isMeaningfulCharacterLogsheetRow(normalizedHeaders, row));

  if (!meaningfulRows.length) {
    redirectWithCharacterError(
      "/player/characters/new",
      "No character rows were found to import.",
      "import",
    );
  }

  await ensureCharacterCapacity(user, meaningfulRows.length, "/player/characters/new");

  const createPayloads = meaningfulRows.map(({ row, rowNumber }) => {
    const importedRow = buildImportedCharacterRow(normalizedHeaders, row, {
        legalBuildMagicItemOptions: resources.legalBuildMagicItemOptions,
        legalCommonMagicItemOptions: resources.legalMagicItemOptions.Common,
        legalToolOptions: resources.legalToolOptions,
        legalLanguageOptions: resources.legalLanguageOptions,
        legalFeatOptions: resources.legalFeatOptions,
      });

    return validateAndBuildCharacterCreateData({
      input: importedRow,
      errorType: "import",
      isPubliclyViewable: importedRow.isPubliclyViewable,
      messagePrefix: `Row ${rowNumber}: `,
      path: "/player/characters/new",
      resources,
      tokenImagePath: null,
    });
  });

  const createdCharacters = await prisma.$transaction(
    createPayloads.map((payload) =>
      prisma.character.create({
        data: {
          userId: user.id,
          ...payload,
        },
      })
    )
  );

  revalidatePath("/");
  revalidatePath("/player");
  revalidatePath("/dm/players");
  revalidatePath("/dm/achievements");

  if (createdCharacters.length === 1) {
    redirect(`/player/characters/${createdCharacters[0].id}/edit?created=1&message=Character%20imported.`);
  }

  redirect(`/player?charactersImported=${createdCharacters.length}`);
}
