import { z } from "zod";
import {
  isLegalSubclassForClassFromMap,
  type LegalSubclassOptionsMap,
} from "@/lib/character-options";
import {
  getClassGrantedLanguages,
  LEGACY_FEAT_COMPATIBILITY_OPTIONS,
  MAX_CHARM_SLOT_COUNT,
  MAX_CONSUMABLE_SLOT_COUNT,
  parseToggleSelections,
} from "@/lib/character";
import type {
  LegalBlessingOptions,
  LegalBoonOptions,
  LegalCharmOptions,
  LegalFeatOptions,
  LegalLanguageOptions,
  LegalToolOptions,
} from "@/lib/league-legal-choices";

export const passwordSchema = z.string().min(8).max(100);
export const discordHandleSchema = z
  .string()
  .trim()
  .max(60)
  .optional()
  .or(z.literal(""));
export const leagueRoleSchema = z.enum(["PLAYER", "DM"]);
export const leagueRolesSchema = z.array(leagueRoleSchema).min(1);

export function hasDiscordHandle(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function rolesRequireDiscordHandle(roles: Array<"PLAYER" | "DM">) {
  return roles.includes("PLAYER") || roles.includes("DM");
}

export const registerSchema = z.object({
  name: z.string().min(2),
  discordHandle: discordHandleSchema,
  email: z.string().email(),
  password: passwordSchema,
  roles: leagueRolesSchema,
  acceptTerms: z.literal(true),
}).superRefine((data, ctx) => {
  if (data.roles.includes("DM") && !hasDiscordHandle(data.discordHandle)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Discord handle is required when registering as a Dungeon Master.",
      path: ["discordHandle"],
    });
  }
});

export const oauthRoleSelectionSchema = z.object({
  discordHandle: discordHandleSchema,
  roles: leagueRolesSchema,
}).superRefine((data, ctx) => {
  if (rolesRequireDiscordHandle(data.roles) && !hasDiscordHandle(data.discordHandle)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add a Discord handle so players and organizers can coordinate with you.",
      path: ["discordHandle"],
    });
  }
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional().default(""),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function createOptionalIntegerField(max: number) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? undefined : Number(trimmed);
      }

      return value ?? undefined;
    },
    z.number().int().min(0).max(max).optional()
  );
}

const optionalIntegerField = createOptionalIntegerField(99);
const optionalHitPointField = createOptionalIntegerField(999);

export const characterSchema = z
  .object({
    name: z.string().min(2).max(60),
    characterSheetLink: z.string().trim().url().max(500).optional().or(z.literal("")),
    blindsightFt: optionalHitPointField,
    darkvisionFt: optionalHitPointField,
    tremorsenseFt: optionalHitPointField,
    truesightFt: optionalHitPointField,
    hitPoints: optionalHitPointField,
    armorClass: optionalIntegerField,
    passivePerception: optionalIntegerField,
    spellSaveDc: optionalIntegerField,
    class1Name: z.string().min(2).max(40),
    class1Subclass: z.string().max(80).optional().or(z.literal("")),
    class1Level: z.coerce.number().int().min(1).max(20),
    class2Name: z.string().max(40).optional().or(z.literal("")),
    class2Subclass: z.string().max(80).optional().or(z.literal("")),
    class2Level: z.coerce.number().int().min(0).max(20),
    class3Name: z.string().max(40).optional().or(z.literal("")),
    class3Subclass: z.string().max(80).optional().or(z.literal("")),
    class3Level: z.coerce.number().int().min(0).max(20),
    feats: z.string().trim().max(2000).optional().or(z.literal("")),
    proficiencies: z.string().trim().max(2000).optional().or(z.literal("")),
    tools: z.string().trim().max(2000).optional().or(z.literal("")),
    languages: z.string().trim().max(2000).optional().or(z.literal("")),
    notes: z.string().trim().max(4000).optional().or(z.literal("")),
    backstory: z.string().trim().max(4000).optional().or(z.literal("")),
    totalGold: z.coerce.number().int().min(0),
    magicItems: z.array(z.string().trim().min(1).max(80)).max(10),
    magicItemNames: z
      .array(z.string().trim().max(160))
      .max(10),
    magicItemMinorProperties: z
      .array(z.string().trim().max(80))
      .max(10),
    magicItemFlavors: z
      .array(z.string().trim().max(2000))
      .max(10),
    commonMagicItems: z.array(z.string().trim().min(1).max(80)).max(5),
    commonMagicItemNames: z
      .array(z.string().trim().max(160))
      .max(5),
    commonMagicItemMinorProperties: z
      .array(z.string().trim().max(80))
      .max(5),
    commonMagicItemFlavors: z
      .array(z.string().trim().max(2000))
      .max(5),
    consumables: z
      .array(z.string().trim().min(1).max(80))
      .max(MAX_CONSUMABLE_SLOT_COUNT),
    boon: z.string().trim().max(80).optional().or(z.literal("")),
    blessing: z.string().trim().max(80).optional().or(z.literal("")),
    charms: z.array(z.string().trim().min(1).max(80)).max(MAX_CHARM_SLOT_COUNT),
  })
  .refine(
    (data) => data.class1Level + data.class2Level + data.class3Level <= 20,
    {
      message: "Character total level cannot exceed 20.",
      path: ["class1Level"],
    }
  );

type CharacterFormData = z.infer<typeof characterSchema>;

const characterFieldErrorMessages: Partial<Record<keyof CharacterFormData, string>> = {
  name: "Character name must be between 2 and 60 characters.",
  characterSheetLink: "Character sheet link must be a valid URL.",
  blindsightFt: "Blindsight must be a whole number between 0 and 999.",
  darkvisionFt: "Darkvision must be a whole number between 0 and 999.",
  tremorsenseFt: "Tremorsense must be a whole number between 0 and 999.",
  truesightFt: "Truesight must be a whole number between 0 and 999.",
  hitPoints: "Character HP must be a whole number between 0 and 999.",
  armorClass: "Character AC must be a whole number between 0 and 99.",
  passivePerception: "Passive Perception must be a whole number between 0 and 99.",
  spellSaveDc: "Character Spell Save DC must be a whole number between 0 and 99.",
  class1Name: "Choose a class for Class 1.",
  class1Subclass: "Class 1 subclass is too long.",
  class1Level: "Class 1 level must be between 1 and 20.",
  class2Name: "Class 2 name is too long.",
  class2Subclass: "Class 2 subclass is too long.",
  class2Level: "Class 2 level must be between 0 and 20.",
  class3Name: "Class 3 name is too long.",
  class3Subclass: "Class 3 subclass is too long.",
  class3Level: "Class 3 level must be between 0 and 20.",
  feats: "The selected feats could not be saved. Please review the feats section.",
  proficiencies: "The selected skills could not be saved. Please review the skills section.",
  tools: "The selected tools could not be saved. Please review the tools section.",
  languages: "The selected languages could not be saved. Please review the languages section.",
  notes: "Notes must be 4000 characters or fewer.",
  backstory: "Character backstory must be 4000 characters or fewer.",
  totalGold: "Total gold must be a whole number of 0 or more.",
  magicItems: "Each current build magic item must be 80 characters or fewer.",
  magicItemNames: "Each current build magic item name must be 160 characters or fewer.",
  magicItemMinorProperties: "Each current build magic item minor property must be 80 characters or fewer.",
  magicItemFlavors: "Each current build magic item notes field must be 2000 characters or fewer.",
  commonMagicItems: "Each common magic item must be 80 characters or fewer.",
  commonMagicItemNames: "Each common magic item name must be 160 characters or fewer.",
  commonMagicItemMinorProperties: "Each common magic item minor property must be 80 characters or fewer.",
  commonMagicItemFlavors: "Each common magic item notes field must be 2000 characters or fewer.",
  consumables: "Each consumable must be 80 characters or fewer.",
  boon: "Boon must be 80 characters or fewer.",
  blessing: "Blessing must be 80 characters or fewer.",
  charms: "Each charm must be 80 characters or fewer.",
};

export function getCharacterValidationMessage(error: z.ZodError<CharacterFormData>) {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return "Review the character details and try again.";
  }

  const field = firstIssue.path[0] as keyof CharacterFormData | undefined;

  if (firstIssue.message === "Character total level cannot exceed 20.") {
    return firstIssue.message;
  }

  if (field && characterFieldErrorMessages[field]) {
    return characterFieldErrorMessages[field] as string;
  }

  return firstIssue.message || "Review the character details and try again.";
}

export function validateCharacterChoices(
  data: CharacterFormData,
  options: {
    legalSubclassOptions: LegalSubclassOptionsMap;
    legalFeatOptions: LegalFeatOptions;
    legalToolOptions: LegalToolOptions;
    legalLanguageOptions: LegalLanguageOptions;
    legalBoonOptions: LegalBoonOptions;
    legalBlessingOptions: LegalBlessingOptions;
    legalCharmOptions: LegalCharmOptions;
  }
) {
  const issues: string[] = [];
  const messages: string[] = [];
  const legalFeatSet = new Set(options.legalFeatOptions);
  for (const feat of LEGACY_FEAT_COMPATIBILITY_OPTIONS) {
    legalFeatSet.add(feat);
  }
  const legalToolSet = new Set(options.legalToolOptions);
  const legalLanguageSet = new Set(options.legalLanguageOptions);
  const legalBoonSet = new Set(options.legalBoonOptions);
  const legalBlessingSet = new Set(options.legalBlessingOptions);
  const legalCharmSet = new Set(options.legalCharmOptions);
  const classGrantedLanguages = getClassGrantedLanguages([
    { className: data.class1Name, level: data.class1Level },
    { className: data.class2Name, level: data.class2Level },
    { className: data.class3Name, level: data.class3Level },
  ]);

  for (const language of classGrantedLanguages) {
    legalLanguageSet.add(language);
  }

  if (
    !isLegalSubclassForClassFromMap(
      options.legalSubclassOptions,
      data.class1Name,
      data.class1Subclass
    )
  ) {
    issues.push("class1Subclass");
    messages.push("Choose a valid subclass for Class 1.");
  }

  if (
    !isLegalSubclassForClassFromMap(
      options.legalSubclassOptions,
      data.class2Name,
      data.class2Subclass
    )
  ) {
    issues.push("class2Subclass");
    messages.push("Choose a valid subclass for Class 2.");
  }

  if (
    !isLegalSubclassForClassFromMap(
      options.legalSubclassOptions,
      data.class3Name,
      data.class3Subclass
    )
  ) {
    issues.push("class3Subclass");
    messages.push("Choose a valid subclass for Class 3.");
  }

  const invalidFeat = Object.keys(parseToggleSelections(data.feats)).find(
    (feat) => !legalFeatSet.has(feat)
  );

  if (invalidFeat) {
    issues.push("feats");
    messages.push(`"${invalidFeat}" is not in the legal feats list.`);
  }

  const invalidTool = Object.keys(parseToggleSelections(data.tools)).find(
    (tool) => !legalToolSet.has(tool)
  );

  if (invalidTool) {
    issues.push("tools");
    messages.push(`"${invalidTool}" is not in the legal tools list.`);
  }

  const invalidLanguage = Object.keys(parseToggleSelections(data.languages)).find(
    (language) => !legalLanguageSet.has(language)
  );

  if (invalidLanguage) {
    issues.push("languages");
    messages.push(`"${invalidLanguage}" is not in the legal languages list.`);
  }

  if (options.legalBoonOptions.length && data.boon && !legalBoonSet.has(data.boon)) {
    issues.push("boon");
    messages.push(`"${data.boon}" is not in the legal boons list.`);
  }

  if (
    options.legalBlessingOptions.length &&
    data.blessing &&
    !legalBlessingSet.has(data.blessing)
  ) {
    issues.push("blessing");
    messages.push(`"${data.blessing}" is not in the legal blessings list.`);
  }

  if (options.legalCharmOptions.length) {
    const invalidCharm = data.charms.find((charm) => !legalCharmSet.has(charm));

    if (invalidCharm) {
      issues.push("charms");
      messages.push(`"${invalidCharm}" is not in the legal charms list.`);
    }
  }

  return {
    success: issues.length === 0,
    invalidFields: issues,
    message: messages[0] ?? null,
  };
}

export const gameSchema = z.object({
  title: z.string().trim().min(1, "Game title").max(120),
  adventureCode: z.string().trim().min(1, "Adventure code").max(40),
  source: z.string().trim().max(160).default(""),
  gameSummary: z.string().trim().max(1500).default(""),
  ticketPrice: z.string().trim().min(1).max(40),
  isGrimTidings: z.boolean().default(false),
  grimTidingCost: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? 1 : Number(trimmed);
      }

      return value;
    },
    z.number().int().min(1).max(99)
  ),
  ticketAccessCode: z
    .string()
    .trim()
    .max(100)
    .default("")
    .refine((value) => value === "" || value.length >= 4, "Ticket access code"),
  datePlayed: z.string().trim().min(1, "Date and time"),
  duration: z.string().trim().max(80).default(""),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  seatCapacity: z.coerce.number().int().min(1).max(12),
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
  rewardsSummary: z.string().trim().min(1, "Awarded Gold"),
  magicItemsAwarded: z.string().max(1500).default(""),
  consumablesAwarded: z.string().max(500).default(""),
  spellbookAwarded: z.string().trim().max(1500).default(""),
  sessionNotes: z.string().trim().min(1, "Session notes/Story Awards"),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  participants: z
    .array(
      z.object({
        userId: z.string().min(1),
        characterId: z.string().trim().min(1).nullable(),
      })
    ),
});

export const gameParticipantsSchema = z
  .array(
    z.object({
      userId: z.string().min(1),
      characterId: z.string().trim().min(1).nullable(),
    })
  );
