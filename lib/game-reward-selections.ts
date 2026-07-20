export type LegalRewardOptions = {
  legalBuildMagicItemOptions: string[];
  legalCommonMagicItemOptions: string[];
  legalConsumableOptions: string[];
  legalBoonOptions: string[];
  legalBlessingOptions: string[];
  legalCharmOptions: string[];
};

export type ParsedGameRewardSelections = {
  buildMagicItems: string[];
  commonMagicItems: string[];
  consumables: string[];
  boons: string[];
  blessings: string[];
  charms: string[];
  additionalMagicRewardNotes: string;
  additionalConsumableNotes: string;
};

const BULLET_PREFIX = "\u2022 ";

function stripBulletPrefix(value: string) {
  return value.replace(/^[-*\u2022]\s*/, "").trim();
}

function parseBulletLines(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => stripBulletPrefix(line))
    .filter(Boolean);
}

function serializeBulletLines(lines: string[]) {
  return lines.length ? lines.map((line) => `${BULLET_PREFIX}${line}`).join("\n") : "";
}

function pushMatchedLine(
  line: string,
  options: LegalRewardOptions,
  selections: ParsedGameRewardSelections,
  unmatchedLines: string[]
) {
  if (options.legalBuildMagicItemOptions.includes(line)) {
    selections.buildMagicItems.push(line);
    return;
  }

  if (options.legalCommonMagicItemOptions.includes(line)) {
    selections.commonMagicItems.push(line);
    return;
  }

  if (options.legalBoonOptions.includes(line)) {
    selections.boons.push(line);
    return;
  }

  if (options.legalBlessingOptions.includes(line)) {
    selections.blessings.push(line);
    return;
  }

  if (options.legalCharmOptions.includes(line)) {
    selections.charms.push(line);
    return;
  }

  unmatchedLines.push(line);
}

export function parseStoredGameRewardSelections(
  {
    magicItemsAwarded,
    consumablesAwarded,
  }: {
    magicItemsAwarded: string;
    consumablesAwarded: string;
  },
  options: LegalRewardOptions
): ParsedGameRewardSelections {
  const selections: ParsedGameRewardSelections = {
    buildMagicItems: [],
    commonMagicItems: [],
    consumables: [],
    boons: [],
    blessings: [],
    charms: [],
    additionalMagicRewardNotes: "",
    additionalConsumableNotes: "",
  };
  const unmatchedMagicLines: string[] = [];
  const unmatchedConsumableLines: string[] = [];

  for (const line of parseBulletLines(magicItemsAwarded)) {
    pushMatchedLine(line, options, selections, unmatchedMagicLines);
  }

  for (const line of parseBulletLines(consumablesAwarded)) {
    if (options.legalConsumableOptions.includes(line)) {
      selections.consumables.push(line);
      continue;
    }

    unmatchedConsumableLines.push(line);
  }

  selections.additionalMagicRewardNotes = unmatchedMagicLines.join("\n");
  selections.additionalConsumableNotes = unmatchedConsumableLines.join("\n");

  return selections;
}

export function buildStoredGameRewardStrings(
  selections: ParsedGameRewardSelections
) {
  const magicRewardLines = [
    ...selections.buildMagicItems,
    ...selections.commonMagicItems,
    ...selections.boons,
    ...selections.blessings,
    ...selections.charms,
    ...parseBulletLines(selections.additionalMagicRewardNotes),
  ];
  const consumableRewardLines = [
    ...selections.consumables,
    ...parseBulletLines(selections.additionalConsumableNotes),
  ];

  return {
    magicItemsAwarded: serializeBulletLines(magicRewardLines),
    consumablesAwarded: serializeBulletLines(consumableRewardLines),
  };
}

export function readGameRewardSelectionsFromFormData(formData: FormData) {
  return {
    buildMagicItems: formData
      .getAll("rewardBuildMagicItems")
      .map((value) => String(value).trim())
      .filter(Boolean),
    commonMagicItems: formData
      .getAll("rewardCommonMagicItems")
      .map((value) => String(value).trim())
      .filter(Boolean),
    consumables: formData
      .getAll("rewardConsumables")
      .map((value) => String(value).trim())
      .filter(Boolean),
    boons: formData
      .getAll("rewardBoons")
      .map((value) => String(value).trim())
      .filter(Boolean),
    blessings: formData
      .getAll("rewardBlessings")
      .map((value) => String(value).trim())
      .filter(Boolean),
    charms: formData
      .getAll("rewardCharms")
      .map((value) => String(value).trim())
      .filter(Boolean),
    additionalMagicRewardNotes: String(
      formData.get("magicItemsAwardedAdditional") ?? ""
    ).trim(),
    additionalConsumableNotes: String(
      formData.get("consumablesAwardedAdditional") ?? ""
    ).trim(),
  } satisfies ParsedGameRewardSelections;
}

export function hasStructuredGameRewardSelectionFields(formData: FormData) {
  return [
    "rewardBuildMagicItems",
    "rewardCommonMagicItems",
    "rewardConsumables",
    "rewardBoons",
    "rewardBlessings",
    "rewardCharms",
    "magicItemsAwardedAdditional",
    "consumablesAwardedAdditional",
  ].some((fieldName) => formData.has(fieldName));
}
