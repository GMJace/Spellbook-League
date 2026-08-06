export type LegalRewardOptions = {
  legalBuildMagicItemOptions: string[];
  legalCommonMagicItemOptions: string[];
  legalConsumableOptions: string[];
  legalBoonOptions: string[];
  legalBlessingOptions: string[];
  legalCharmOptions: string[];
  legalMinorPropertyOptions: string[];
};

export type ParsedGameRewardSelections = {
  buildMagicItems: string[];
  buildMagicItemNames: string[];
  buildMagicItemMinorProperties: string[];
  buildMagicItemFlavors: string[];
  commonMagicItems: string[];
  commonMagicItemNames: string[];
  commonMagicItemMinorProperties: string[];
  commonMagicItemFlavors: string[];
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

function parseMagicRewardLine(
  line: string,
  itemOptions: string[],
  minorPropertyOptions: string[]
) {
  let item = line.trim();
  let name = "";
  let minorProperty = "";
  let flavor = "";
  const detailPattern = /\s+\((Name|Minor Property|Notes \(Flavor\)|Flavor):\s*([^)]*)\)\s*$/;

  while (true) {
    const match = item.match(detailPattern);

    if (!match || match.index == null) {
      break;
    }

    const [, label, value] = match;

    if (label === "Name") {
      name = value.trim();
    } else if (label === "Minor Property") {
      minorProperty = value.trim();
    } else if (label === "Notes (Flavor)" || label === "Flavor") {
      flavor = value.trim();
    }

    item = item.slice(0, match.index).trim();
  }

  if (!itemOptions.includes(item)) {
    return null;
  }

  if (minorProperty && !minorPropertyOptions.includes(minorProperty)) {
    return null;
  }

  return {
    item,
    name,
    minorProperty,
    flavor,
  };
}

function formatMagicRewardLine(
  item: string,
  name: string,
  minorProperty: string,
  flavor: string
) {
  const details = [
    name ? `(Name: ${name})` : "",
    minorProperty ? `(Minor Property: ${minorProperty})` : "",
    flavor ? `(Notes (Flavor): ${flavor})` : "",
  ].filter(Boolean);

  return details.length ? `${item} ${details.join(" ")}` : item;
}

function pushMatchedLine(
  line: string,
  options: LegalRewardOptions,
  selections: ParsedGameRewardSelections,
  unmatchedLines: string[]
) {
  const buildMagicItemMatch = parseMagicRewardLine(
    line,
    options.legalBuildMagicItemOptions,
    options.legalMinorPropertyOptions
  );

  if (buildMagicItemMatch) {
    selections.buildMagicItems.push(buildMagicItemMatch.item);
    selections.buildMagicItemNames.push(buildMagicItemMatch.name);
    selections.buildMagicItemMinorProperties.push(buildMagicItemMatch.minorProperty);
    selections.buildMagicItemFlavors.push(buildMagicItemMatch.flavor);
    return;
  }

  const commonMagicItemMatch = parseMagicRewardLine(
    line,
    options.legalCommonMagicItemOptions,
    options.legalMinorPropertyOptions
  );

  if (commonMagicItemMatch) {
    selections.commonMagicItems.push(commonMagicItemMatch.item);
    selections.commonMagicItemNames.push(commonMagicItemMatch.name);
    selections.commonMagicItemMinorProperties.push(commonMagicItemMatch.minorProperty);
    selections.commonMagicItemFlavors.push(commonMagicItemMatch.flavor);
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
    buildMagicItemNames: [],
    buildMagicItemMinorProperties: [],
    buildMagicItemFlavors: [],
    commonMagicItems: [],
    commonMagicItemNames: [],
    commonMagicItemMinorProperties: [],
    commonMagicItemFlavors: [],
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
    ...selections.buildMagicItems.map((item, index) =>
      formatMagicRewardLine(
        item,
        selections.buildMagicItemNames[index] ?? "",
        selections.buildMagicItemMinorProperties[index] ?? "",
        selections.buildMagicItemFlavors[index] ?? ""
      )
    ),
    ...selections.commonMagicItems.map((item, index) =>
      formatMagicRewardLine(
        item,
        selections.commonMagicItemNames[index] ?? "",
        selections.commonMagicItemMinorProperties[index] ?? "",
        selections.commonMagicItemFlavors[index] ?? ""
      )
    ),
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

function compressSlottedSelections(
  items: string[],
  names: string[],
  minorProperties: string[],
  flavors: string[]
) {
  const nextItems: string[] = [];
  const nextNames: string[] = [];
  const nextMinorProperties: string[] = [];
  const nextFlavors: string[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] ?? "";

    if (!item) {
      continue;
    }

    nextItems.push(item);
    nextNames.push(names[index] ?? "");
    nextMinorProperties.push(minorProperties[index] ?? "");
    nextFlavors.push(flavors[index] ?? "");
  }

  return {
    items: nextItems,
    names: nextNames,
    minorProperties: nextMinorProperties,
    flavors: nextFlavors,
  };
}

export function readGameRewardSelectionsFromFormData(formData: FormData) {
  const compressedBuildMagicItems = compressSlottedSelections(
    formData
      .getAll("rewardBuildMagicItems")
      .map((value) => String(value).trim()),
    formData
      .getAll("rewardBuildMagicItemNames")
      .map((value) => String(value).trim()),
    formData
      .getAll("rewardBuildMagicItemMinorProperties")
      .map((value) => String(value).trim())
    ,
    formData
      .getAll("rewardBuildMagicItemFlavors")
      .map((value) => String(value).trim())
  );
  const compressedCommonMagicItems = compressSlottedSelections(
    formData
      .getAll("rewardCommonMagicItems")
      .map((value) => String(value).trim()),
    formData
      .getAll("rewardCommonMagicItemNames")
      .map((value) => String(value).trim()),
    formData
      .getAll("rewardCommonMagicItemMinorProperties")
      .map((value) => String(value).trim())
    ,
    formData
      .getAll("rewardCommonMagicItemFlavors")
      .map((value) => String(value).trim())
  );

  return {
    buildMagicItems: compressedBuildMagicItems.items,
    buildMagicItemNames: compressedBuildMagicItems.names,
    buildMagicItemMinorProperties: compressedBuildMagicItems.minorProperties,
    buildMagicItemFlavors: compressedBuildMagicItems.flavors,
    commonMagicItems: compressedCommonMagicItems.items,
    commonMagicItemNames: compressedCommonMagicItems.names,
    commonMagicItemMinorProperties: compressedCommonMagicItems.minorProperties,
    commonMagicItemFlavors: compressedCommonMagicItems.flavors,
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
    "rewardBuildMagicItemNames",
    "rewardBuildMagicItemMinorProperties",
    "rewardBuildMagicItemFlavors",
    "rewardCommonMagicItems",
    "rewardCommonMagicItemNames",
    "rewardCommonMagicItemMinorProperties",
    "rewardCommonMagicItemFlavors",
    "rewardConsumables",
    "rewardBoons",
    "rewardBlessings",
    "rewardCharms",
    "magicItemsAwardedAdditional",
    "consumablesAwardedAdditional",
  ].some((fieldName) => formData.has(fieldName));
}
