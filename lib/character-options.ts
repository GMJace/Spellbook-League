export const DND_CLASSES = [
  "Artificer",
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;

export const DEFAULT_LEGAL_SUBCLASS_OPTIONS = {
  Artificer: [
    "Alchemist",
    "Armorer",
    "Artillerist",
    "Battle Smith",
    "Cartographer",
    "Reanimator",
  ],
  Barbarian: [
    "Path of the Ancestral Guardian",
    "Path of the Battlerager",
    "Path of the Beast",
    "Path of the Berserker",
    "Path of the Giant",
    "Path of the Juggernaut",
    "Path of the Wild Heart",
    "Path of the World Tree",
    "Path of the Zealot",
    "Path of Wild Magic",
  ],
  Bard: [
    "College of Creation",
    "College of Dance",
    "College of Eloquence",
    "College of Glamour",
    "College of Lore",
    "College of Spirits",
    "College of Swords",
    "College of the Moon",
    "College of Tragedy",
    "College of Valor",
    "College of Whispers",
  ],
  Cleric: [
    "Arcana Domain",
    "Blood Domain",
    "Forge Domain",
    "Grave Domain",
    "Knowledge Domain",
    "Life Domain",
    "Light Domain",
    "Moon Domain",
    "Nature Domain",
    "Order Domain",
    "Peace Domain",
    "Tempest Domain",
    "Trickery Domain",
    "Twilight Domain",
    "War Domain",
  ],
  Druid: [
    "Circle of Dreams",
    "Circle of Spores",
    "Circle of Stars",
    "Circle of the Blighted",
    "Circle of the Land",
    "Circle of the Moon",
    "Circle of the Sea",
    "Circle of the Shepherd",
    "Circle of Wildfire",
  ],
  Fighter: [
    "Arcane Archer",
    "Banneret",
    "Battle Master",
    "Cavalier",
    "Echo Knight",
    "Eldritch Knight",
    "Psi Warrior",
    "Rune Knight",
    "Samurai",
  ],
  Monk: [
    "Warrior of Mercy",
    "Warrior of Shadow",
    "Warrior of the Elements",
    "Warrior of the Open Hand",
    "Way of the Ascendant Dragon",
    "Way of the Astral Self",
    "Way of the Cobalt Soul",
    "Way of the Drunken Master",
    "Way of the Kensei",
    "Way of the Long Death",
    "Way of the Sun Soul",
  ],
  Paladin: [
    "Oath of Conquest",
    "Oath of Devotion",
    "Oath of Glory",
    "Oath of Redemption",
    "Oath of the Ancients",
    "Oath of the Crown",
    "Oath of the Noble Genies",
    "Oath of the Open Sea",
    "Oath of the Watchers",
    "Oath of Vengeance",
  ],
  Ranger: [
    "Beast Master",
    "Drakewarden",
    "Fey Wanderer",
    "Gloom Stalker",
    "Hollow Warden",
    "Horizon Walker",
    "Hunter",
    "Monster Slayer",
    "Swarmkeeper",
    "Winter Walker",
  ],
  Rogue: [
    "Arcane Trickster",
    "Assassin",
    "Inquisitive",
    "Mastermind",
    "Phantom",
    "Scion of the Three",
    "Scout",
    "Soulknife",
    "Swashbuckler",
    "Thief",
  ],
  Sorcerer: [
    "Aberrant Sorcery",
    "Clockwork Sorcery",
    "Divine Soul",
    "Draconic Sorcery",
    "Lunar Sorcery",
    "Runechild",
    "Shadow Magic / Shadow Sorcery",
    "Spellfire Sorcery",
    "Storm Sorcery",
    "Wild Magic Sorcery",
  ],
  Warlock: [
    "Archfey Patron",
    "Celestial Patron",
    "Fathomless",
    "Fiend Patron",
    "Genie",
    "Great Old One Patron",
    "Hexblade",
    "Undead Patron",
    "Undying",
  ],
  Wizard: [
    "Abjurer",
    "Bladesinger",
    "Blood Magic",
    "Chronurgy Magic",
    "Diviner",
    "Evoker",
    "Graviturgy Magic",
    "Illusionist",
    "Order of Scribes",
    "School of Conjuration",
    "School of Enchantment",
    "School of Necromancy",
    "School of Transmutation",
    "War Magic",
  ],
} as const;

export type DndClassName = keyof typeof DEFAULT_LEGAL_SUBCLASS_OPTIONS;
export type LegalSubclassOptionsMap = Record<DndClassName, string[]>;

export function isDndClassName(value: string): value is DndClassName {
  return value in DEFAULT_LEGAL_SUBCLASS_OPTIONS;
}

export function getDefaultLegalSubclassOptions(): LegalSubclassOptionsMap {
  return Object.fromEntries(
    DND_CLASSES.map((className) => [className, [...DEFAULT_LEGAL_SUBCLASS_OPTIONS[className]]])
  ) as LegalSubclassOptionsMap;
}

export function getSubclassOptionsForClassFromMap(
  optionsMap: LegalSubclassOptionsMap,
  className: string | null | undefined
): string[] {
  if (!className || !isDndClassName(className)) {
    return [];
  }

  return [...(optionsMap[className] ?? [])];
}

export function getSubclassOptionsForClass(
  className: string | null | undefined
) {
  return getSubclassOptionsForClassFromMap(getDefaultLegalSubclassOptions(), className);
}

export function isLegalSubclassForClassFromMap(
  optionsMap: LegalSubclassOptionsMap,
  className: string | null | undefined,
  subclassName: string | null | undefined
) {
  if (!subclassName?.trim()) {
    return true;
  }

  if (!className || !isDndClassName(className)) {
    return false;
  }

  return (optionsMap[className] ?? []).includes(subclassName.trim());
}

export function isLegalSubclassForClass(
  className: string | null | undefined,
  subclassName: string | null | undefined
) {
  return isLegalSubclassForClassFromMap(
    getDefaultLegalSubclassOptions(),
    className,
    subclassName
  );
}

export function normalizeLeagueChoiceValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}
