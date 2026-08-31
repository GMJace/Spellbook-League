import {
  DND_FEATS,
  DND_LANGUAGES,
  DND_SKILLS,
  DND_TOOLS,
  serializeFeatSelections,
  serializeLanguageSelections,
  serializeSkillSelections,
  serializeToolSelections,
} from "@/lib/character";
import { DND_CLASSES } from "@/lib/character-options";

export type DndBeyondCharacterPdfImport = {
  armorClass?: number | null;
  blindsightFt?: number | null;
  characterSheetLink: string | null;
  class1Level?: number;
  class1Name?: string;
  class1Subclass?: string | null;
  class2Level?: number | null;
  class2Name?: string | null;
  class2Subclass?: string | null;
  class3Level?: number | null;
  class3Name?: string | null;
  class3Subclass?: string | null;
  darkvisionFt?: number | null;
  feats?: string;
  hitPoints?: number | null;
  backstory?: string;
  languages?: string;
  name?: string;
  passivePerception?: number | null;
  proficiencies?: string;
  spellSaveDc?: number | null;
  totalGold?: number;
  tremorsenseFt?: number | null;
  truesightFt?: number | null;
  tools?: string;
};

const CLASS_NAMES = [...DND_CLASSES];

const PDF_SKILL_FIELD_MAP: Array<{
  fieldName: string;
  skillName: (typeof DND_SKILLS)[number]["name"];
}> = [
  { fieldName: "AcrobaticsProf", skillName: "Acrobatics" },
  { fieldName: "AnimalHandlingProf", skillName: "Animal Handling" },
  { fieldName: "ArcanaProf", skillName: "Arcana" },
  { fieldName: "AthleticsProf", skillName: "Athletics" },
  { fieldName: "DeceptionProf", skillName: "Deception" },
  { fieldName: "HistoryProf", skillName: "History" },
  { fieldName: "InsightProf", skillName: "Insight" },
  { fieldName: "IntimidationProf", skillName: "Intimidation" },
  { fieldName: "InvestigationProf", skillName: "Investigation" },
  { fieldName: "MedicineProf", skillName: "Medicine" },
  { fieldName: "NatureProf", skillName: "Nature" },
  { fieldName: "PerceptionProf", skillName: "Perception" },
  { fieldName: "PerformanceProf", skillName: "Performance" },
  { fieldName: "PersuasionProf", skillName: "Persuasion" },
  { fieldName: "ReligionProf", skillName: "Religion" },
  { fieldName: "SleightOfHandProf", skillName: "Sleight of Hand" },
  { fieldName: "StealthProf", skillName: "Stealth" },
  { fieldName: "SurvivalProf", skillName: "Survival" },
] as const;

function coerceInteger(value: null | string | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.replace(/,/g, "").trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "none" || normalizedValue === "--") {
    return null;
  }

  const parsed = Number.parseInt(normalizedValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceNumber(value: null | string | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.replace(/,/g, "").trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "none" || normalizedValue === "--") {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePdfText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function decodePdfEscapedString(value: string) {
  let index = 0;
  let result = "";

  while (index < value.length) {
    const character = value[index];

    if (character !== "\\") {
      result += character;
      index += 1;
      continue;
    }

    const next = value[index + 1];

    if (!next) {
      index += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      const octalMatch = value.slice(index + 1).match(/^[0-7]{1,3}/);

      if (octalMatch) {
        result += String.fromCharCode(Number.parseInt(octalMatch[0], 8));
        index += 1 + octalMatch[0].length;
        continue;
      }
    }

    const escapedCharacters: Record<string, string> = {
      "\\": "\\",
      "(": "(",
      ")": ")",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };

    result += escapedCharacters[next] ?? next;
    index += 2;
  }

  return result;
}

function decodePdfHexString(value: string) {
  const normalizedValue = value.replace(/\s+/g, "");

  if (!normalizedValue) {
    return "";
  }

  const byteValues: number[] = [];

  for (let index = 0; index < normalizedValue.length - 1; index += 2) {
    const byteValue = Number.parseInt(normalizedValue.slice(index, index + 2), 16);

    if (Number.isFinite(byteValue)) {
      byteValues.push(byteValue);
    }
  }

  if (byteValues.length >= 2 && byteValues[0] === 0xfe && byteValues[1] === 0xff) {
    let decodedText = "";

    for (let index = 2; index < byteValues.length - 1; index += 2) {
      decodedText += String.fromCharCode((byteValues[index] << 8) | byteValues[index + 1]);
    }

    return decodedText;
  }

  return String.fromCharCode(...byteValues);
}

function readPdfLiteralString(source: string, startIndex: number) {
  let depth = 1;
  let index = startIndex + 1;
  let result = "";

  while (index < source.length) {
    const character = source[index];

    if (character === "\\") {
      const next = source[index + 1] ?? "";

      if (next === "\r" && source[index + 2] === "\n") {
        index += 3;
        continue;
      }

      if (next === "\n" || next === "\r") {
        index += 2;
        continue;
      }

      result += `\\${next}`;
      index += 2;
      continue;
    }

    if (character === "(") {
      depth += 1;
      result += character;
      index += 1;
      continue;
    }

    if (character === ")") {
      depth -= 1;

      if (depth === 0) {
        return {
          endIndex: index,
          value: decodePdfEscapedString(result),
        };
      }

      result += character;
      index += 1;
      continue;
    }

    result += character;
    index += 1;
  }

  return null;
}

function readPdfHexString(source: string, startIndex: number) {
  let index = startIndex + 1;
  let result = "";

  while (index < source.length) {
    const character = source[index];

    if (character === ">") {
      return {
        endIndex: index,
        value: decodePdfHexString(result),
      };
    }

    result += character;
    index += 1;
  }

  return null;
}

function extractPdfObjectString(objectSource: string, key: string) {
  let keyIndex = -1;
  let searchStartIndex = 0;

  while (searchStartIndex < objectSource.length) {
    const candidateIndex = objectSource.indexOf(`/${key}`, searchStartIndex);

    if (candidateIndex < 0) {
      return null;
    }

    const nextCharacter = objectSource[candidateIndex + key.length + 1] ?? "";

    if (!/[A-Za-z0-9]/.test(nextCharacter)) {
      keyIndex = candidateIndex;
      break;
    }

    searchStartIndex = candidateIndex + key.length + 1;
  }

  if (keyIndex < 0) {
    return null;
  }

  let index = keyIndex + key.length + 1;

  while (index < objectSource.length && /\s/.test(objectSource[index])) {
    index += 1;
  }

  if (objectSource[index] === "(") {
    const parsedLiteralString = readPdfLiteralString(objectSource, index);
    return parsedLiteralString ? normalizePdfText(parsedLiteralString.value) : null;
  }

  if (objectSource[index] === "<" && objectSource[index + 1] !== "<") {
    const parsedHexString = readPdfHexString(objectSource, index);
    return parsedHexString ? normalizePdfText(parsedHexString.value) : null;
  }

  return null;
}

function extractPdfObjectReference(objectSource: string, key: string) {
  const keyPattern = new RegExp(`/${key}(?![A-Za-z0-9])\\s+(\\d+)\\s+(\\d+)\\s+R`);
  const match = objectSource.match(keyPattern);

  return match ? `${match[1]} ${match[2]}` : null;
}

function extractIndirectPdfString(
  objects: Map<string, string>,
  reference: string | null,
) {
  if (!reference) {
    return null;
  }

  const objectSource = objects.get(reference);

  if (!objectSource) {
    return null;
  }

  const directValue =
    extractPdfObjectString(objectSource, "V") ?? extractPdfObjectString(objectSource, "DV");

  if (directValue !== null) {
    return directValue;
  }

  const objectBodyStart = objectSource.indexOf("obj") + "obj".length;
  let index = objectBodyStart;

  while (index < objectSource.length && /\s/.test(objectSource[index])) {
    index += 1;
  }

  if (objectSource[index] === "(") {
    const parsedLiteralString = readPdfLiteralString(objectSource, index);
    return parsedLiteralString ? normalizePdfText(parsedLiteralString.value) : null;
  }

  if (objectSource[index] === "<" && objectSource[index + 1] !== "<") {
    const parsedHexString = readPdfHexString(objectSource, index);
    return parsedHexString ? normalizePdfText(parsedHexString.value) : null;
  }

  return null;
}

function extractWidgetFieldsFromPdf(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const fields = new Map<string, string>();
  const objects = new Map<string, string>();
  const objectPattern = /\b\d+\s+\d+\s+obj\b/g;
  let objectMatch = objectPattern.exec(source);

  while (objectMatch) {
    const objectStart = objectMatch.index;
    const objectEnd = source.indexOf("endobj", objectStart);

    if (objectEnd < 0) {
      break;
    }

    const objectSource = source.slice(objectStart, objectEnd);
    const objectReferenceMatch = objectSource.match(/^(\d+)\s+(\d+)\s+obj\b/);

    if (objectReferenceMatch) {
      objects.set(`${objectReferenceMatch[1]} ${objectReferenceMatch[2]}`, objectSource);
    }

    objectPattern.lastIndex = objectEnd + "endobj".length;
    objectMatch = objectPattern.exec(source);
  }

  objectPattern.lastIndex = 0;
  objectMatch = objectPattern.exec(source);

  while (objectMatch) {
    const objectStart = objectMatch.index;
    const objectEnd = source.indexOf("endobj", objectStart);

    if (objectEnd < 0) {
      break;
    }

    const objectSource = source.slice(objectStart, objectEnd);

    if (objectSource.includes("/Subtype/Widget")) {
      const fieldName = extractPdfObjectString(objectSource, "T");

      if (fieldName) {
        const fieldValue =
          extractPdfObjectString(objectSource, "V") ??
          extractIndirectPdfString(objects, extractPdfObjectReference(objectSource, "V")) ??
          extractPdfObjectString(objectSource, "DV") ??
          extractIndirectPdfString(objects, extractPdfObjectReference(objectSource, "DV")) ??
          "";

        if (fieldValue || !fields.has(fieldName)) {
          fields.set(fieldName, fieldValue);
        }
      }
    }

    objectPattern.lastIndex = objectEnd + "endobj".length;
    objectMatch = objectPattern.exec(source);
  }

  return fields;
}

function parseClassLevels(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return {
      class1Level: 1,
      class1Name: "",
      class1Subclass: null,
      class2Level: null,
      class2Name: null,
      class2Subclass: null,
      class3Level: null,
      class3Name: null,
      class3Subclass: null,
    };
  }

  const classPattern = new RegExp(
    `\\b(${CLASS_NAMES.map((className) => className.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})\\b\\s*(\\d+)`,
    "gi",
  );
  const classEntries = Array.from(normalizedValue.matchAll(classPattern))
    .map((match) => ({
      className: CLASS_NAMES.find((className) => className.toLowerCase() === match[1].toLowerCase()) ?? match[1],
      level: Number.parseInt(match[2], 10),
    }))
    .slice(0, 3);

  return {
    class1Level: classEntries[0]?.level ?? 1,
    class1Name: classEntries[0]?.className ?? "",
    class1Subclass: null,
    class2Level: classEntries[1]?.level ?? null,
    class2Name: classEntries[1]?.className ?? null,
    class2Subclass: null,
    class3Level: classEntries[2]?.level ?? null,
    class3Name: classEntries[2]?.className ?? null,
    class3Subclass: null,
  };
}

function buildFeaturesText(fields: Map<string, string>) {
  const featureEntries = [...fields.entries()]
    .filter(([fieldName]) => /^FeaturesTraits\d+$/.test(fieldName))
    .sort((left, right) => {
      const leftNumber = Number.parseInt(left[0].replace(/\D+/g, ""), 10);
      const rightNumber = Number.parseInt(right[0].replace(/\D+/g, ""), 10);
      return leftNumber - rightNumber;
    });

  return featureEntries
    .map(([, value]) => value)
    .filter(Boolean)
    .join("\n");
}

function cleanSubclassName(value: string) {
  return value
    .replace(/\s+\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applySubclassesFromFeatures(
  classData: ReturnType<typeof parseClassLevels>,
  featuresText: string,
) {
  const subclassPattern = /([A-Za-z' ]+?)\s+Subclass[\s\S]{0,120}?\|\s*([^\n\r]+)/g;
  const subclassByClass = new Map<string, string>();

  for (const match of featuresText.matchAll(subclassPattern)) {
    subclassByClass.set(match[1].trim().toLowerCase(), cleanSubclassName(match[2]));
  }

  return {
    ...classData,
    class1Subclass: classData.class1Name
      ? subclassByClass.get(classData.class1Name.toLowerCase()) ?? null
      : null,
    class2Subclass: classData.class2Name
      ? subclassByClass.get(classData.class2Name.toLowerCase()) ?? null
      : null,
    class3Subclass: classData.class3Name
      ? subclassByClass.get(classData.class3Name.toLowerCase()) ?? null
      : null,
  };
}

function collectFeats(featuresText: string) {
  const featsHeaderIndex = featuresText.indexOf("=== FEATS ===");
  const featsSection =
    featsHeaderIndex >= 0 ? featuresText.slice(featsHeaderIndex + "=== FEATS ===".length) : featuresText;
  const featSelections: Record<string, true> = {};
  const knownFeats = [...DND_FEATS].sort((left, right) => right.length - left.length);

  function normalizeFeatName(value: string) {
    return value
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\bMagic Initiate\s*:\s*/i, "Magic Initiate (")
      .replace(/^(Magic Initiate \([^)]*)(?!\))$/, "$1)")
      .replace(/[^a-z0-9]+/gi, "")
      .toLowerCase();
  }

  for (const match of featsSection.matchAll(/^\*\s*([^\n\r]+)/gm)) {
    const importedFeatName = match[1]
      .replace(/^\d+:\s*/, "")
      .replace(/\s+(?:\u2022|\||�|["“”]).*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    const normalizedImportedFeatName = normalizeFeatName(importedFeatName);
    const knownFeat = knownFeats.find(
      (featName) => normalizeFeatName(featName) === normalizedImportedFeatName,
    );

    if (knownFeat) {
      featSelections[knownFeat] = true;
    }
  }

  return serializeFeatSelections(featSelections);
}

function collectSkillSelections(fields: Map<string, string>) {
  const selections: Partial<Record<(typeof DND_SKILLS)[number]["name"], "proficiency" | "expertise">> =
    {};

  for (const { fieldName, skillName } of PDF_SKILL_FIELD_MAP) {
    const fieldValue = fields.get(fieldName)?.trim().toUpperCase() ?? "";

    if (fieldValue === "E") {
      selections[skillName] = "expertise";
      continue;
    }

    if (fieldValue === "P") {
      selections[skillName] = "proficiency";
    }
  }

  return serializeSkillSelections(selections);
}

function extractNamedSectionEntries(value: string, sectionName: string) {
  const sectionMatch = value.match(
    new RegExp(`===\\s*${sectionName}\\s*===\\s*([\\s\\S]*?)(?=\\n\\s*===|$)`, "i"),
  );

  if (!sectionMatch) {
    return [];
  }

  return sectionMatch[1]
    .split(/[\n,;]+/)
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeSelectionName(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function collectToolSelections(fields: Map<string, string>) {
  const selectedToolNames = new Set(
    extractNamedSectionEntries(fields.get("ProficienciesLang") ?? "", "TOOLS").map(
      normalizeSelectionName,
    ),
  );

  return serializeToolSelections(
    DND_TOOLS.reduce((selections, tool) => {
      if (selectedToolNames.has(normalizeSelectionName(tool.name))) {
        selections[tool.name] = true;
      }

      return selections;
    }, {} as Partial<Record<(typeof DND_TOOLS)[number]["name"], true>>),
  );
}

function collectLanguageSelections(fields: Map<string, string>) {
  const selectedLanguageNames = new Set(
    extractNamedSectionEntries(fields.get("ProficienciesLang") ?? "", "LANGUAGES").map(
      normalizeSelectionName,
    ),
  );

  return serializeLanguageSelections(
    DND_LANGUAGES.reduce((selections, language) => {
      if (selectedLanguageNames.has(normalizeSelectionName(language))) {
        selections[language] = true;
      }

      return selections;
    }, {} as Record<string, true>),
  );
}

function extractSenseValue(additionalSenses: string, senseName: string) {
  const match = additionalSenses.match(new RegExp(`${senseName}\\s*(\\d+)\\s*ft`, "i"));
  return match ? Number.parseInt(match[1], 10) : null;
}

function deriveCharacterSheetLink(fileName: string) {
  const idMatch = fileName.match(/(?:^|_)(\d{6,})(?:\.[^.]+)?$/);

  if (!idMatch) {
    return null;
  }

  return `https://www.dndbeyond.com/characters/${idMatch[1]}`;
}

function computeTotalGold(fields: Map<string, string>) {
  const cp = coerceNumber(fields.get("CP")) ?? 0;
  const sp = coerceNumber(fields.get("SP")) ?? 0;
  const ep = coerceNumber(fields.get("EP")) ?? 0;
  const gp = coerceNumber(fields.get("GP")) ?? 0;
  const pp = coerceNumber(fields.get("PP")) ?? 0;

  const total = cp / 100 + sp / 10 + ep / 2 + gp + pp * 10;
  return Number.isFinite(total) ? Number.parseFloat(total.toFixed(2)) : 0;
}

function findFirstFieldValue(fields: Map<string, string>, fieldNamePattern: RegExp) {
  for (const [fieldName, value] of fields) {
    if (fieldNamePattern.test(fieldName) && value.trim()) {
      return value;
    }
  }

  return null;
}

export async function importCharacterFromDndBeyondPdf(file: File) {
  if (file.size <= 0) {
    throw new Error("Choose a D&D Beyond exported PDF first.");
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Upload a D&D Beyond exported PDF file.");
  }

  const fields = extractWidgetFieldsFromPdf(Buffer.from(await file.arrayBuffer()));

  if (!fields.size) {
    throw new Error("We couldn't find any character fields in that PDF export.");
  }

  const featuresText = buildFeaturesText(fields);
  const classes = applySubclassesFromFeatures(
    parseClassLevels(fields.get("CLASS  LEVEL")),
    featuresText,
  );
  const additionalSenses = fields.get("AdditionalSenses") ?? "";

  return {
    ...classes,
    armorClass: coerceInteger(fields.get("AC")),
    backstory: (fields.get("Backstory") ?? "").slice(0, 4000),
    blindsightFt: extractSenseValue(additionalSenses, "Blindsight"),
    characterSheetLink: deriveCharacterSheetLink(file.name),
    darkvisionFt: extractSenseValue(additionalSenses, "Darkvision"),
    feats: collectFeats(featuresText),
    hitPoints: coerceInteger(fields.get("MaxHP")),
    languages: collectLanguageSelections(fields),
    name: fields.get("CharacterName") ?? "",
    passivePerception: coerceInteger(fields.get("Passive1")),
    proficiencies: collectSkillSelections(fields),
    spellSaveDc:
      coerceInteger(fields.get("AbilitySaveDC")) ??
      coerceInteger(fields.get("AbilitySaveDC2")) ??
      coerceInteger(findFirstFieldValue(fields, /^spellSaveDC\d+$/i)),
    totalGold: computeTotalGold(fields),
    tremorsenseFt: extractSenseValue(additionalSenses, "Tremorsense"),
    truesightFt: extractSenseValue(additionalSenses, "Truesight"),
    tools: collectToolSelections(fields),
  } satisfies DndBeyondCharacterPdfImport;
}
