import { normalizeLeagueChoiceValues } from "@/lib/character-options";

type CharacterLevels = {
  class1Level: number;
  class2Level: number | null;
  class3Level: number | null;
};

export type CharacterBuild = CharacterLevels & {
  class1Name: string;
  class1Subclass?: string | null;
  class2Name: string | null;
  class2Subclass?: string | null;
  class3Name: string | null;
  class3Subclass?: string | null;
};

export type CharacterBuildEntry = {
  className: string;
  subclassName: string | null;
  level: number;
};

export type SkillSelectionRank = "proficiency" | "expertise";

export const DND_SKILLS = [
  { ability: "DEX", name: "Acrobatics" },
  { ability: "WIS", name: "Animal Handling" },
  { ability: "INT", name: "Arcana" },
  { ability: "STR", name: "Athletics" },
  { ability: "CHA", name: "Deception" },
  { ability: "INT", name: "History" },
  { ability: "WIS", name: "Insight" },
  { ability: "CHA", name: "Intimidation" },
  { ability: "INT", name: "Investigation" },
  { ability: "WIS", name: "Medicine" },
  { ability: "INT", name: "Nature" },
  { ability: "WIS", name: "Perception" },
  { ability: "CHA", name: "Performance" },
  { ability: "CHA", name: "Persuasion" },
  { ability: "INT", name: "Religion" },
  { ability: "DEX", name: "Sleight of Hand" },
  { ability: "DEX", name: "Stealth" },
  { ability: "WIS", name: "Survival" },
] as const;

export const DND_TOOLS = [
  { category: "Artisan's Tools", name: "Alchemist's Supplies" },
  { category: "Artisan's Tools", name: "Brewer's Supplies" },
  { category: "Artisan's Tools", name: "Calligrapher's Supplies" },
  { category: "Artisan's Tools", name: "Carpenter's Tools" },
  { category: "Artisan's Tools", name: "Cartographer's Tools" },
  { category: "Artisan's Tools", name: "Cobbler's Tools" },
  { category: "Artisan's Tools", name: "Cook's Utensils" },
  { category: "Artisan's Tools", name: "Glassblower's Tools" },
  { category: "Artisan's Tools", name: "Jeweler's Tools" },
  { category: "Artisan's Tools", name: "Leatherworker's Tools" },
  { category: "Artisan's Tools", name: "Mason's Tools" },
  { category: "Artisan's Tools", name: "Painter's Supplies" },
  { category: "Artisan's Tools", name: "Potter's Tools" },
  { category: "Artisan's Tools", name: "Smith's Tools" },
  { category: "Artisan's Tools", name: "Tinker's Tools" },
  { category: "Artisan's Tools", name: "Weaver's Tools" },
  { category: "Artisan's Tools", name: "Woodcarver's Tools" },
  { category: "Other Tools and Kits", name: "Disguise Kit" },
  { category: "Other Tools and Kits", name: "Forgery Kit" },
  { category: "Other Tools and Kits", name: "Herbalism Kit" },
  { category: "Other Tools and Kits", name: "Navigator's Tools" },
  { category: "Other Tools and Kits", name: "Poisoner's Kit" },
  { category: "Other Tools and Kits", name: "Thieves' Tools" },
  { category: "Gaming Sets", name: "Dice Set" },
  { category: "Gaming Sets", name: "Dragonchess Set" },
  { category: "Gaming Sets", name: "Playing Card Set" },
  { category: "Gaming Sets", name: "Three-Dragon Ante Set" },
  { category: "Musical Instruments", name: "Bagpipes" },
  { category: "Musical Instruments", name: "Drum" },
  { category: "Musical Instruments", name: "Dulcimer" },
  { category: "Musical Instruments", name: "Flute" },
  { category: "Musical Instruments", name: "Horn" },
  { category: "Musical Instruments", name: "Lute" },
  { category: "Musical Instruments", name: "Lyre" },
  { category: "Musical Instruments", name: "Pan Flute" },
  { category: "Musical Instruments", name: "Shawm" },
  { category: "Musical Instruments", name: "Viol" },
] as const;

export const CLASS_GRANTED_LANGUAGE_GROUP_TITLE = "Class-Granted Languages";

export const CLASS_GRANTED_LANGUAGE_RULES = [
  { className: "Druid", language: "Druidic" },
  { className: "Rogue", language: "Thieves' Cant" },
] as const;

export const CLASS_GRANTED_LANGUAGES = CLASS_GRANTED_LANGUAGE_RULES.map(
  (rule) => rule.language
);

export const DND_LANGUAGE_GROUPS = [
  {
    title: "Player's Handbook (2024) Standard Languages",
    languages: [
      "Common",
      "Common Sign Language",
      "Draconic",
      "Dwarvish",
      "Elvish",
      "Giant",
      "Gnomish",
      "Goblin",
      "Halfling",
      "Orc",
    ],
  },
  {
    title: "Player's Handbook (2024) Rare Languages",
    languages: [
      "Abyssal",
      "Celestial",
      "Deep Speech",
      "Infernal",
      "Primordial",
      "Sylvan",
      "Undercommon",
    ],
  },
  {
    title: "Primordial Dialects",
    languages: ["Aquan", "Auran", "Ignan", "Terran"],
  },
  {
    title: "Tomb of Annihilation",
    languages: ["Chultan"],
  },
  {
    title: "Sword Coast Adventurer's Guide Human Languages",
    languages: [
      "Alzhedo",
      "Chondathan",
      "Damaran",
      "Illuskan",
      "Midani",
      "Mulhorandi",
      "Shaaran",
      "Shou",
      "Tuigan",
      "Uluik",
      "Untheric",
      "Waelan",
    ],
  },
  {
    title: "Ancient or Regional Languages",
    languages: ["Loross", "Netherese", "Roushoum"],
  },
  {
    title: "Scripts",
    languages: ["Dethek", "Espruar", "Thorass"],
  },
  {
    title: CLASS_GRANTED_LANGUAGE_GROUP_TITLE,
    note: "Automatically granted based on the character's classes.",
    languages: [...CLASS_GRANTED_LANGUAGES],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  note?: string;
  languages: readonly string[];
}>;

export const DND_FEAT_GROUPS = [
  {
    title: "Origin Feats",
    feats: [
      "Alert",
      "Crafter",
      "Healer",
      "Lucky",
      "Magic Initiate (Cleric)",
      "Magic Initiate (Druid)",
      "Magic Initiate (Wizard)",
      "Musician",
      "Savage Attacker",
      "Skilled",
      "Tavern Brawler",
      "Tough",
    ],
  },
  {
    title: "General Feats",
    feats: [
      "Ability Score Improvement",
      "Actor",
      "Athlete",
      "Charger",
      "Chef",
      "Crossbow Expert",
      "Crusher",
      "Defensive Duelist",
      "Dual Wielder",
      "Durable",
      "Elemental Adept",
      "Fey-Touched",
      "Grappler",
      "Great Weapon Master",
      "Heavily Armored",
      "Heavy Armor Master",
      "Inspiring Leader",
      "Keen Mind",
      "Lightly Armored",
      "Mage Slayer",
      "Martial Weapon Training",
      "Medium Armor Master",
      "Moderately Armored",
      "Mounted Combatant",
      "Observant",
      "Piercer",
      "Poisoner",
      "Polearm Master",
      "Resilient",
      "Ritual Caster",
      "Sentinel",
      "Shadow-Touched",
      "Sharpshooter",
      "Shield Master",
      "Skill Expert",
      "Skulker",
      "Slasher",
      "Speedy",
      "Spell Sniper",
      "Telekinetic",
      "Telepathic",
      "War Caster",
      "Weapon Master",
    ],
  },
  {
    title: "Fighting Style Feats",
    note: "These generally require access to the Fighting Style feature.",
    feats: [
      "Archery",
      "Blind Fighting",
      "Defense",
      "Dueling",
      "Great Weapon Fighting",
      "Interception",
      "Protection",
      "Thrown Weapon Fighting",
      "Two-Weapon Fighting",
      "Unarmed Fighting",
    ],
  },
  {
    title: "Epic Boon Feats",
    note: "These generally require the character to be level 19 or higher.",
    feats: [
      "Boon of Combat Prowess",
      "Boon of Dimensional Travel",
      "Boon of Energy Resistance",
      "Boon of Fate",
      "Boon of Fortitude",
      "Boon of Irresistible Offense",
      "Boon of Recovery",
      "Boon of Skill",
      "Boon of Speed",
      "Boon of Spell Recall",
      "Boon of the Night Spirit",
      "Boon of Truesight",
    ],
  },
  {
    title: "Player's Handbook (2014)",
    note: "The AL guide specifically retains these two feats because they had not yet received updated versions.",
    feats: ["Dungeon Delver", "Martial Adept"],
  },
  {
    title: "Bigby Presents: Glory of the Giants",
    feats: [
      "Ember of the Fire Giant",
      "Fury of the Frost Giant",
      "Guile of the Cloud Giant",
      "Keenness of the Stone Giant",
      "Soul of the Storm Giant",
      "Strike of the Giants",
      "Vigor of the Hill Giant",
    ],
  },
  {
    title: "The Book of Many Things",
    feats: ["Cartomancer"],
  },
  {
    title: "Dragonlance: Shadow of the Dragon Queen",
    feats: [
      "Adept of the Black Robes",
      "Adept of the Red Robes",
      "Adept of the White Robes",
      "Divinely Favored",
      "Initiate of High Sorcery",
      "Knight of the Crown",
      "Knight of the Rose",
      "Knight of the Sword",
      "Squire of Solamnia",
    ],
  },
  {
    title: "Eberron: Rising from the Last War",
    feats: ["Aberrant Dragonmark", "Revenant Blade"],
  },
  {
    title: "Fizban's Treasury of Dragons",
    feats: [
      "Gift of the Chromatic Dragon",
      "Gift of the Gem Dragon",
      "Gift of the Metallic Dragon",
    ],
  },
  {
    title: "Forgotten Realms: Heroes of Faerun",
    feats: ["Cold Caster", "Fairy Trickster", "Genie Magic", "Street Justice"],
  },
  {
    title: "Planescape: Adventures in the Multiverse",
    feats: [
      "Agent of Order",
      "Baleful Scion",
      "Cohort of Chaos",
      "Outlands Envoy",
      "Planar Wanderer",
      "Righteous Heritor",
      "Scion of the Outer Planes",
    ],
  },
  {
    title: "Sword Coast Adventurer's Guide",
    feats: ["Deep Gnome Magic"],
  },
  {
    title: "Tasha's Cauldron of Everything",
    note: "The following feats do not currently have replacements in the 2024 Player's Handbook.",
    feats: [
      "Artificer Initiate",
      "Eldritch Adept",
      "Fighting Initiate",
      "Gunner",
      "Metamagic Adept",
    ],
  },
  {
    title: "Xanathar's Guide to Everything",
    feats: [
      "Bountiful Luck",
      "Dragon Fear",
      "Dragon Hide",
      "Drow High Magic",
      "Dwarven Fortitude",
      "Elven Accuracy",
      "Fade Away",
      "Fey Teleportation",
      "Flames of Phlegethos",
      "Infernal Constitution",
      "Orcish Fury",
      "Prodigy",
      "Second Chance",
      "Squat Nimbleness",
      "Wood Elf Magic",
    ],
  },
] as const;

export const LEGACY_FEAT_COMPATIBILITY_OPTIONS = [
  "Magic Initiate",
  "Magic Initiate : Cleric",
  "Magic Initiate : Druid",
  "Magic Initiate : Wizard",
] as const;

export const ELEMENTAL_ADEPT_TYPES = [
  "Acid",
  "Cold",
  "Fire",
  "Lightning",
  "Thunder",
] as const;

export const DND_LANGUAGES: string[] = DND_LANGUAGE_GROUPS.flatMap((group) => [
  ...group.languages,
]);
export const DND_FEATS = DND_FEAT_GROUPS.flatMap((group) =>
  group.feats.flatMap((feat) =>
    feat === "Elemental Adept"
      ? [
          feat,
          ...ELEMENTAL_ADEPT_TYPES.map(
            (damageType) => `Elemental Adept (${damageType})`
          ),
        ]
      : [feat]
  )
);

export const SPLIT_MAGIC_INITIATE_ORIGIN_FEATS = [
  "Magic Initiate (Cleric)",
  "Magic Initiate (Druid)",
  "Magic Initiate (Wizard)",
] as const;

export function normalizeLegalFeatOptions(legalFeatOptions: string[]) {
  return normalizeLeagueChoiceValues(
    legalFeatOptions.map((feat) => {
      if (feat === "Magic Initiate") {
        return feat;
      }

      if (feat === "Magic Initiate : Cleric") {
        return "Magic Initiate (Cleric)";
      }

      if (feat === "Magic Initiate : Druid") {
        return "Magic Initiate (Druid)";
      }

      if (feat === "Magic Initiate : Wizard") {
        return "Magic Initiate (Wizard)";
      }

      return feat;
    }).flatMap((feat) =>
      feat === "Magic Initiate" ? [...SPLIT_MAGIC_INITIATE_ORIGIN_FEATS] : [feat]
    )
  );
}

export type LegalToolGroup = {
  title: string;
  note?: string;
  tools: string[];
};

export type LegalLanguageGroup = {
  title: string;
  note?: string;
  languages: string[];
};

export type LegalFeatGroup = {
  title: string;
  note?: string;
  feats: string[];
};

export const TOOL_GROUP_NOTES: Partial<Record<string, string>> = {
  "Gaming Sets": "Each gaming set is a separate proficiency.",
  "Musical Instruments": "Each instrument is a separate proficiency.",
};

export function getLegalToolGroups(legalToolOptions: string[]): LegalToolGroup[] {
  const legalToolSet = new Set(legalToolOptions);
  const knownToolNames = new Set<string>(DND_TOOLS.map((tool) => tool.name));
  const groups = Array.from(new Set(DND_TOOLS.map((tool) => tool.category))).reduce(
    (nextGroups, category) => {
      const tools = DND_TOOLS.filter(
        (tool) => tool.category === category && legalToolSet.has(tool.name)
      ).map((tool) => tool.name);

      if (tools.length) {
        nextGroups.push({
          title: category,
          note: TOOL_GROUP_NOTES[category],
          tools,
        });
      }

      return nextGroups;
    },
    [] as LegalToolGroup[]
  );

  const additionalTools = normalizeLeagueChoiceValues(
    legalToolOptions.filter((tool) => !knownToolNames.has(tool))
  );

  if (additionalTools.length) {
    groups.push({
      title: "Additional legal tools",
      tools: additionalTools,
    });
  }

  return groups;
}

export function getLegalLanguageGroups(
  legalLanguageOptions: string[]
): LegalLanguageGroup[] {
  const legalLanguageSet = new Set(legalLanguageOptions);
  const knownLanguageNames = new Set<string>(DND_LANGUAGES);
  const classGrantedLanguageNames = new Set<string>(CLASS_GRANTED_LANGUAGES);
  const groups = DND_LANGUAGE_GROUPS.reduce((nextGroups, group) => {
    const isClassGrantedGroup = group.title === CLASS_GRANTED_LANGUAGE_GROUP_TITLE;
    const languages = isClassGrantedGroup
      ? [...group.languages]
      : group.languages.filter((language) => legalLanguageSet.has(language));

    if (languages.length) {
      nextGroups.push({
        title: group.title,
        note: "note" in group ? group.note : undefined,
        languages: [...languages],
      });
    }

    return nextGroups;
  }, [] as LegalLanguageGroup[]);

  const additionalLanguages = normalizeLeagueChoiceValues(
    legalLanguageOptions.filter(
      (language) =>
        !knownLanguageNames.has(language) && !classGrantedLanguageNames.has(language)
    )
  );

  if (additionalLanguages.length) {
    groups.push({
      title: "Additional legal languages",
      languages: additionalLanguages,
    });
  }

  return groups;
}

export function getLegalFeatGroups(legalFeatOptions: string[]): LegalFeatGroup[] {
  const legalFeatSet = new Set(legalFeatOptions);
  const groups = DND_FEAT_GROUPS.reduce((nextGroups, group) => {
    const feats = group.feats.flatMap((feat) => {
      if (feat !== "Elemental Adept") {
        return legalFeatSet.has(feat) ? [feat] : [];
      }

      const variants = ELEMENTAL_ADEPT_TYPES.map(
        (damageType) => `Elemental Adept (${damageType})`
      ).filter((variant) => legalFeatSet.has(variant));

      return legalFeatSet.has(feat) ? [feat, ...variants] : variants;
    });

    if (feats.length) {
      nextGroups.push({
        title: group.title,
        note: "note" in group ? group.note : undefined,
        feats,
      });
    }

    return nextGroups;
  }, [] as LegalFeatGroup[]);

  const additionalFeats = normalizeLeagueChoiceValues(
    legalFeatOptions.filter((feat) => !DND_FEATS.includes(feat))
  );

  if (additionalFeats.length) {
    groups.push({
      title: "Additional legal feats",
      feats: additionalFeats,
    });
  }

  return groups;
}

export const COMMON_MAGIC_ITEM_SLOT_COUNT = 5;
export const MAX_CONSUMABLE_SLOT_COUNT = 15;
export const MAX_CHARM_SLOT_COUNT = 5;

type CharacterLike = CharacterLevels & {
  magicItems: string;
};

export function getCharacterTotalLevel(character: CharacterLevels) {
  return (
    character.class1Level +
    (character.class2Level ?? 0) +
    (character.class3Level ?? 0)
  );
}

export function getCharacterTier(totalLevel: number) {
  if (totalLevel >= 17) {
    return 4;
  }

  if (totalLevel >= 11) {
    return 3;
  }

  if (totalLevel >= 5) {
    return 2;
  }

  return 1;
}

export function getMagicItemLimit(tier: number) {
  if (tier === 4) {
    return 10;
  }

  if (tier === 3) {
    return 6;
  }

  if (tier === 2) {
    return 3;
  }

  return 1;
}

export function getConsumableItemLimit(tier: number) {
  if (tier === 4) {
    return 15;
  }

  if (tier === 3 || tier === 2) {
    return 10;
  }

  return 5;
}

export function hasBoonSlot(tier: number) {
  return tier === 4;
}

export function getCharmSlotCount(tier: number) {
  if (tier === 1) {
    return 2;
  }

  return 5;
}

export function parseMagicItems(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function parseSkillSelections(value: string | null | undefined) {
  if (!value?.trim()) {
    return {} as Partial<Record<(typeof DND_SKILLS)[number]["name"], SkillSelectionRank>>;
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return DND_SKILLS.reduce(
        (next, skill) => {
          const rank = parsed[skill.name];
          if (rank === "proficiency" || rank === "expertise") {
            next[skill.name] = rank;
          }
          return next;
        },
        {} as Partial<Record<(typeof DND_SKILLS)[number]["name"], SkillSelectionRank>>
      );
    }
  } catch {
    // Fall back to legacy free-text parsing for older character records.
  }

  const normalizedValue = value.toLowerCase();

  return DND_SKILLS.reduce(
    (next, skill) => {
      const normalizedSkillName = skill.name.toLowerCase();
      if (normalizedValue.includes(normalizedSkillName)) {
        next[skill.name] =
          normalizedValue.includes(`${normalizedSkillName} (expertise)`) ||
          normalizedValue.includes(`${normalizedSkillName} - expertise`) ||
          normalizedValue.includes(`${normalizedSkillName}: expertise`) ||
          normalizedValue.includes(`expertise ${normalizedSkillName}`)
            ? "expertise"
            : "proficiency";
      }
      return next;
    },
    {} as Partial<Record<(typeof DND_SKILLS)[number]["name"], SkillSelectionRank>>
  );
}

export function parseToggleSelections(value: string | null | undefined) {
  if (!value?.trim()) {
    return {} as Record<string, true>;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return normalizeLeagueChoiceValues(
        parsed.filter((entry): entry is string => typeof entry === "string")
      ).reduce((next, entry) => {
        next[entry] = true;
        return next;
      }, {} as Record<string, true>);
    }

    if (parsed && typeof parsed === "object") {
      return normalizeLeagueChoiceValues(
        Object.entries(parsed).flatMap(([entry, selected]) =>
          selected === true ? [entry] : []
        )
      ).reduce((next, entry) => {
        next[entry] = true;
        return next;
      }, {} as Record<string, true>);
    }
  } catch {
    return normalizeLeagueChoiceValues(value.split(/\r?\n/)).reduce((next, entry) => {
      next[entry] = true;
      return next;
    }, {} as Record<string, true>);
  }

  return {} as Record<string, true>;
}

export function serializeSkillSelections(
  selections: Partial<Record<(typeof DND_SKILLS)[number]["name"], SkillSelectionRank>>
) {
  return JSON.stringify(
    DND_SKILLS.reduce(
      (next, skill) => {
        const rank = selections[skill.name];
        if (rank === "proficiency" || rank === "expertise") {
          next[skill.name] = rank;
        }
        return next;
      },
      {} as Partial<Record<(typeof DND_SKILLS)[number]["name"], SkillSelectionRank>>
    )
  );
}

export function formatSkillSelections(value: string | null | undefined) {
  const parsedSelections = parseSkillSelections(value);
  const formattedSelections = DND_SKILLS.reduce((entries, skill) => {
    const rank = parsedSelections[skill.name];
    if (rank) {
      entries.push(
        `${skill.ability} ${skill.name}${rank === "expertise" ? " (Expertise)" : ""}`
      );
    }
    return entries;
  }, [] as string[]);

  if (formattedSelections.length) {
    return formattedSelections.join("\n");
  }

  return value?.trim() ?? "";
}

export function parseToolSelections(value: string | null | undefined) {
  if (!value?.trim()) {
    return {} as Partial<Record<(typeof DND_TOOLS)[number]["name"], true>>;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return DND_TOOLS.reduce(
        (next, tool) => {
          if (parsed.includes(tool.name)) {
            next[tool.name] = true;
          }
          return next;
        },
        {} as Partial<Record<(typeof DND_TOOLS)[number]["name"], true>>
      );
    }

    if (parsed && typeof parsed === "object") {
      return DND_TOOLS.reduce(
        (next, tool) => {
          if (parsed[tool.name] === true) {
            next[tool.name] = true;
          }
          return next;
        },
        {} as Partial<Record<(typeof DND_TOOLS)[number]["name"], true>>
      );
    }
  } catch {
    // Fall back to legacy free-text parsing for older character records.
  }

  const normalizedValue = value.toLowerCase();

  return DND_TOOLS.reduce(
    (next, tool) => {
      if (normalizedValue.includes(tool.name.toLowerCase())) {
        next[tool.name] = true;
      }
      return next;
    },
    {} as Partial<Record<(typeof DND_TOOLS)[number]["name"], true>>
  );
}

export function serializeToolSelections(
  selections: Partial<Record<(typeof DND_TOOLS)[number]["name"], true>>
) {
  return JSON.stringify(
    DND_TOOLS.filter((tool) => selections[tool.name] === true).map((tool) => tool.name)
  );
}

export function formatToolSelections(value: string | null | undefined) {
  const parsedSelections = parseToolSelections(value);
  const formattedSelections = DND_TOOLS.reduce((entries, tool) => {
    if (parsedSelections[tool.name]) {
      entries.push(tool.name);
    }
    return entries;
  }, [] as string[]);

  if (formattedSelections.length) {
    return formattedSelections.join("\n");
  }

  return value?.trim() ?? "";
}

export function parseFeatSelections(value: string | null | undefined) {
  if (!value?.trim()) {
    return {} as Record<string, true>;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      const parsedFeatSet = new Set(
        parsed.filter((entry): entry is string => typeof entry === "string")
      );

      return [...DND_FEATS, ...LEGACY_FEAT_COMPATIBILITY_OPTIONS].reduce((next, feat) => {
        if (parsedFeatSet.has(feat)) {
          next[feat] = true;
        }
        return next;
      }, {} as Record<string, true>);
    }

    if (parsed && typeof parsed === "object") {
      return [...DND_FEATS, ...LEGACY_FEAT_COMPATIBILITY_OPTIONS].reduce((next, feat) => {
        if (parsed[feat] === true) {
          next[feat] = true;
        }
        return next;
      }, {} as Record<string, true>);
    }
  } catch {
    // Fall back to legacy free-text parsing for older character records.
  }

  const normalizedValue = value.toLowerCase();

  return [...DND_FEATS, ...LEGACY_FEAT_COMPATIBILITY_OPTIONS].reduce((next, feat) => {
    if (normalizedValue.includes(feat.toLowerCase())) {
      next[feat] = true;
    }
    return next;
  }, {} as Record<string, true>);
}

export function serializeFeatSelections(selections: Record<string, true>) {
  return JSON.stringify(
    [...DND_FEATS, ...LEGACY_FEAT_COMPATIBILITY_OPTIONS].filter(
      (feat) => selections[feat] === true
    )
  );
}

export function formatFeatSelections(value: string | null | undefined) {
  const parsedSelections = parseFeatSelections(value);
  const formattedSelections = [...DND_FEATS, ...LEGACY_FEAT_COMPATIBILITY_OPTIONS].filter(
    (feat) => parsedSelections[feat] === true
  );

  if (formattedSelections.length) {
    return formattedSelections.join("\n");
  }

  return value?.trim() ?? "";
}

export function parseLanguageSelections(value: string | null | undefined): Record<string, true> {
  if (!value?.trim()) {
    return {} as Record<string, true>;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return DND_LANGUAGES.reduce((next, language) => {
        if (parsed.includes(language)) {
          next[language] = true;
        }
        return next;
      }, {} as Record<string, true>);
    }

    if (parsed && typeof parsed === "object") {
      return DND_LANGUAGES.reduce((next, language) => {
        if (parsed[language] === true) {
          next[language] = true;
        }
        return next;
      }, {} as Record<string, true>);
    }
  } catch {
    // Fall back to legacy free-text parsing for older character records.
  }

  const normalizedValue = value.toLowerCase();

  return DND_LANGUAGES.reduce((next, language) => {
    if (normalizedValue.includes(language.toLowerCase())) {
      next[language] = true;
    }
    return next;
  }, {} as Record<string, true>);
}

export function serializeLanguageSelections(selections: Record<string, true>) {
  return JSON.stringify(DND_LANGUAGES.filter((language) => selections[language] === true));
}

export function formatLanguageSelections(value: string | null | undefined) {
  const parsedSelections = parseLanguageSelections(value);
  const formattedSelections = DND_LANGUAGES.filter(
    (language) => parsedSelections[language] === true
  );

  if (formattedSelections.length) {
    return formattedSelections.join("\n");
  }

  return value?.trim() ?? "";
}

export function getClassGrantedLanguages(
  classes: Array<{
    className: string | null | undefined;
    level?: number | null | undefined;
  }>
) {
  return CLASS_GRANTED_LANGUAGE_RULES.reduce((grantedLanguages, rule) => {
    const hasMatchingClass = classes.some(
      ({ className, level }) => className === rule.className && (level == null || level > 0)
    );

    if (hasMatchingClass) {
      grantedLanguages.push(rule.language);
    }

    return grantedLanguages;
  }, [] as string[]);
}

function createBuildEntry(
  className: string | null | undefined,
  subclassName: string | null | undefined,
  level: number | null | undefined
) {
    if (!className || !level) {
      return null;
    }

    return {
      className,
      subclassName: subclassName ?? null,
      level,
    };
}

export function getCharacterBuildEntries(character: CharacterBuild) {
  return [
    createBuildEntry(character.class1Name, character.class1Subclass, character.class1Level),
    createBuildEntry(character.class2Name, character.class2Subclass, character.class2Level),
    createBuildEntry(character.class3Name, character.class3Subclass, character.class3Level),
  ].filter((entry): entry is CharacterBuildEntry => Boolean(entry));
}

export function formatClassSummary(character: CharacterBuild) {
  const classes = getCharacterBuildEntries(character).map(
    (entry) => `${entry.className}${entry.subclassName ? ` (${entry.subclassName})` : ""} ${entry.level}`
  );

  return classes.join(" / ");
}
