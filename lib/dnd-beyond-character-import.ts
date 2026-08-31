import { serializeFeatSelections } from "@/lib/character";
import { DND_CLASSES } from "@/lib/character-options";

const DND_BEYOND_HOSTS = new Set([
  "dndbeyond.com",
  "www.dndbeyond.com",
  "ddb.ac",
  "www.ddb.ac",
]);

const DND_BEYOND_FETCH_HEADERS = {
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "User-Agent": "SPELLBOOK League Character Importer",
} as const;

const CLASS_NAME_MAP = new Map(
  DND_CLASSES.map((className) => [className.trim().toLowerCase(), className]),
);

export type DndBeyondCharacterImport = {
  armorClass?: number | null;
  blindsightFt?: number | null;
  characterSheetLink: string;
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
  name?: string;
  passivePerception?: number | null;
  spellSaveDc?: number | null;
  tremorsenseFt?: number | null;
  truesightFt?: number | null;
};

type FetchResult =
  | {
      contentType: string;
      ok: true;
      text: string;
      url: string;
    }
  | {
      ok: false;
      status: number;
      statusText: string;
      url: string;
    };

type CandidateScore = {
  node: Record<string, unknown>;
  score: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    const parsed = Number(normalizedValue);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
}

function coerceString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeClassName(value: unknown) {
  const className = coerceString(value);
  return CLASS_NAME_MAP.get(className.toLowerCase()) ?? className;
}

function parseCharacterIdFromUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    const match = url.pathname.match(/\/characters\/(\d{4,})/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function parseDndBeyondLink(input: string) {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    throw new Error("Paste a D&D Beyond character link first.");
  }

  const withProtocol = /^[a-z]+:\/\//i.test(normalizedInput)
    ? normalizedInput
    : `https://${normalizedInput}`;

  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("That doesn't look like a valid D&D Beyond link.");
  }

  if (!DND_BEYOND_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Use a D&D Beyond share link from dndbeyond.com.");
  }

  return {
    originalUrl: url.toString(),
  };
}

async function fetchCandidate(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: DND_BEYOND_FETCH_HEADERS,
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        url,
      };
    }

    return {
      contentType: response.headers.get("content-type") ?? "",
      ok: true,
      text: await response.text(),
      url: response.url || url,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      statusText: "Fetch failed",
      url,
    };
  }
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function detectDndBeyondAccessProblem(html: string) {
  const normalizedHtml = html.toLowerCase();

  if (
    normalizedHtml.includes("the page you were looking for isn’t here") ||
    normalizedHtml.includes("the page you were looking for isn't here")
  ) {
    return "D&D Beyond returned a missing-page response for that link. The shared link may be expired, private, or only available while signed in there.";
  }

  if (normalizedHtml.includes("sign in to view your")) {
    return "D&D Beyond returned a sign-in page instead of a public character sheet. That usually means the link is not fully public to external viewers.";
  }

  if (normalizedHtml.includes("your privacy choices") && normalizedHtml.includes("accept all")) {
    return "D&D Beyond returned a cookie or access gate instead of the character sheet. The link may still need a browser session to open.";
  }

  return null;
}

function collectJsonScriptPayloads(html: string) {
  const payloads: unknown[] = [];

  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const parsed = safeJsonParse(match[1]);

    if (parsed != null) {
      payloads.push(parsed);
    }
  }

  for (const match of html.matchAll(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const parsed = safeJsonParse(match[1]);

    if (parsed != null) {
      payloads.push(parsed);
    }
  }

  for (const match of html.matchAll(
    /window\.__[A-Z0-9_]+__\s*=\s*({[\s\S]*?});/gi,
  )) {
    const parsed = safeJsonParse(match[1]);

    if (parsed != null) {
      payloads.push(parsed);
    }
  }

  return payloads;
}

function scoreCharacterCandidate(node: Record<string, unknown>) {
  let score = 0;

  if (typeof node.name === "string" && node.name.trim()) {
    score += 2;
  }

  if (Array.isArray(node.classes) && node.classes.length > 0) {
    score += 5;
  }

  if (Array.isArray(node.stats) && node.stats.length > 0) {
    score += 2;
  }

  if (Array.isArray(node.feats) && node.feats.length > 0) {
    score += 1;
  }

  if ("baseHitPoints" in node || "overrideHitPoints" in node || "passivePerception" in node) {
    score += 1;
  }

  if ("modifiers" in node || "inventory" in node) {
    score += 1;
  }

  return score;
}

function findBestCharacterCandidate(root: unknown) {
  const matches: CandidateScore[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    const score = scoreCharacterCandidate(value);

    if (score >= 5) {
      matches.push({ node: value, score });
    }

    for (const nestedValue of Object.values(value)) {
      visit(nestedValue);
    }
  };

  visit(root);

  return matches.sort((left, right) => right.score - left.score)[0]?.node ?? null;
}

function findNumberByKeys(root: unknown, keys: string[]) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  let foundValue: number | null = null;

  const visit = (value: unknown) => {
    if (foundValue != null) {
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const directValue =
        normalizedKeys.has(key.toLowerCase()) ? coerceInteger(nestedValue) : null;

      if (directValue != null) {
        foundValue = directValue;
        return;
      }

      visit(nestedValue);

      if (foundValue != null) {
        return;
      }
    }
  };

  visit(root);
  return foundValue;
}

function extractSenseValue(root: unknown, label: string) {
  const directValue = findNumberByKeys(root, [
    label,
    `${label}Ft`,
    `${label}Feet`,
    `${label}Distance`,
  ]);

  if (directValue != null) {
    return directValue;
  }

  let foundValue: number | null = null;
  const normalizedLabel = label.toLowerCase();

  const visit = (value: unknown) => {
    if (foundValue != null) {
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    const possibleLabel = [value.name, value.label, value.type]
      .map((entry) => coerceString(entry).toLowerCase())
      .find(Boolean);

    if (possibleLabel === normalizedLabel) {
      foundValue =
        coerceInteger(value.distance) ??
        coerceInteger(value.range) ??
        coerceInteger(value.value) ??
        coerceInteger(value.feet);

      if (foundValue != null) {
        return;
      }
    }

    for (const nestedValue of Object.values(value)) {
      visit(nestedValue);

      if (foundValue != null) {
        return;
      }
    }
  };

  visit(root);
  return foundValue;
}

function collectFeatNames(root: unknown) {
  const featNames = new Set<string>();

  const collectFromArray = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }

    for (const entry of value) {
      if (isRecord(entry)) {
        const featName =
          coerceString(entry.name) ||
          coerceString(isRecord(entry.definition) ? entry.definition.name : "");

        if (featName) {
          featNames.add(featName);
        }
      } else if (typeof entry === "string" && entry.trim()) {
        featNames.add(entry.trim());
      }
    }
  };

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        visit(entry);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (key.toLowerCase() === "feats") {
        collectFromArray(nestedValue);
      }

      visit(nestedValue);
    }
  };

  visit(root);

  return serializeFeatSelections(
    [...featNames].reduce((selected, featName) => {
      selected[featName] = true;
      return selected;
    }, {} as Record<string, true>),
  );
}

function extractClasses(characterData: Record<string, unknown>) {
  const classes = Array.isArray(characterData.classes) ? characterData.classes : [];
  const normalizedClasses = classes
    .filter(isRecord)
    .map((entry) => {
      const definition = isRecord(entry.definition) ? entry.definition : null;
      const subclassDefinition = isRecord(entry.subclassDefinition)
        ? entry.subclassDefinition
        : null;
      const className = normalizeClassName(definition?.name ?? entry.name);
      const level = coerceInteger(entry.level);

      return {
        className,
        level,
        subclassName:
          coerceString(subclassDefinition?.name) ||
          coerceString(isRecord(entry.subclass) ? entry.subclass.name : ""),
      };
    })
    .filter((entry) => entry.className && entry.level != null && entry.level > 0)
    .slice(0, 3);

  return {
    class1Level: normalizedClasses[0]?.level ?? 1,
    class1Name: normalizedClasses[0]?.className ?? "",
    class1Subclass: normalizedClasses[0]?.subclassName || null,
    class2Level: normalizedClasses[1]?.level ?? null,
    class2Name: normalizedClasses[1]?.className ?? null,
    class2Subclass: normalizedClasses[1]?.subclassName || null,
    class3Level: normalizedClasses[2]?.level ?? null,
    class3Name: normalizedClasses[2]?.className ?? null,
    class3Subclass: normalizedClasses[2]?.subclassName || null,
  };
}

function extractNumberFromHtml(html: string, labelPatterns: string[]) {
  for (const labelPattern of labelPatterns) {
    const match = html.match(new RegExp(`${labelPattern}[^0-9]{0,80}(\\d{1,3})`, "i"));

    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

function extractSenseFromHtml(html: string, label: string) {
  return extractNumberFromHtml(html, [label]);
}

function buildImportFromCharacterData(
  characterData: Record<string, unknown>,
  fallbackHtml: string | null,
  characterSheetLink: string,
): DndBeyondCharacterImport {
  const classes = extractClasses(characterData);
  const hitPoints =
    coerceInteger(characterData.overrideHitPoints) ??
    coerceInteger(characterData.maxHitPoints) ??
    coerceInteger(characterData.baseHitPoints) ??
    findNumberByKeys(characterData, ["maxHitPoints", "baseHitPoints", "hitPoints"]) ??
    (fallbackHtml ? extractNumberFromHtml(fallbackHtml, ["Hit Points"]) : null);
  const armorClass =
    coerceInteger(characterData.armorClass) ??
    findNumberByKeys(characterData, ["armorClass", "ac"]) ??
    (fallbackHtml ? extractNumberFromHtml(fallbackHtml, ["Armor Class"]) : null);
  const passivePerception =
    coerceInteger(characterData.passivePerception) ??
    coerceInteger(characterData.passiveWisdom) ??
    findNumberByKeys(characterData, ["passivePerception", "passiveWisdom"]) ??
    (fallbackHtml
      ? extractNumberFromHtml(fallbackHtml, ["Passive Perception", "Passive Wisdom"])
      : null);
  const spellSaveDc =
    coerceInteger(characterData.spellSaveDc) ??
    coerceInteger(characterData.spellSaveDC) ??
    findNumberByKeys(characterData, ["spellSaveDc", "spellSaveDC", "spellDC", "spellSave"]) ??
    (fallbackHtml ? extractNumberFromHtml(fallbackHtml, ["Spell Save DC"]) : null);

  return {
    ...classes,
    armorClass,
    blindsightFt:
      extractSenseValue(characterData, "blindsight") ??
      (fallbackHtml ? extractSenseFromHtml(fallbackHtml, "Blindsight") : null),
    characterSheetLink,
    darkvisionFt:
      extractSenseValue(characterData, "darkvision") ??
      (fallbackHtml ? extractSenseFromHtml(fallbackHtml, "Darkvision") : null),
    feats: collectFeatNames(characterData),
    hitPoints,
    name: coerceString(characterData.name),
    passivePerception,
    spellSaveDc,
    tremorsenseFt:
      extractSenseValue(characterData, "tremorsense") ??
      (fallbackHtml ? extractSenseFromHtml(fallbackHtml, "Tremorsense") : null),
    truesightFt:
      extractSenseValue(characterData, "truesight") ??
      (fallbackHtml ? extractSenseFromHtml(fallbackHtml, "Truesight") : null),
  };
}

function isUsableImport(candidate: DndBeyondCharacterImport) {
  return Boolean(
    candidate.name ||
      candidate.class1Name ||
      candidate.hitPoints != null ||
      candidate.armorClass != null ||
      candidate.passivePerception != null,
  );
}

function getCharacterDataFromJson(json: unknown) {
  if (isRecord(json) && isRecord(json.data) && scoreCharacterCandidate(json.data) >= 5) {
    return json.data;
  }

  if (isRecord(json) && isRecord(json.character) && scoreCharacterCandidate(json.character) >= 5) {
    return json.character;
  }

  return findBestCharacterCandidate(json);
}

export async function importCharacterFromDndBeyondLink(input: string) {
  const { originalUrl } = parseDndBeyondLink(input);
  const initialResponse = await fetchCandidate(originalUrl);
  const resolvedCharacterId = initialResponse.ok ? parseCharacterIdFromUrl(initialResponse.url) : null;
  const publicUrl = resolvedCharacterId
    ? `https://www.dndbeyond.com/characters/${resolvedCharacterId}`
    : originalUrl.replace(/\/+$/, "");

  if (initialResponse.ok) {
    const initialAccessProblem = detectDndBeyondAccessProblem(initialResponse.text);

    if (initialAccessProblem) {
      throw new Error(initialAccessProblem);
    }

    const payloads = collectJsonScriptPayloads(initialResponse.text);

    for (const payload of payloads) {
      const characterData = getCharacterDataFromJson(payload);

      if (!characterData) {
        continue;
      }

      const importedCharacter = buildImportFromCharacterData(
        characterData,
        initialResponse.text,
        publicUrl,
      );

      if (isUsableImport(importedCharacter)) {
        return importedCharacter;
      }
    }
  }

  const jsonCandidates = [
    resolvedCharacterId ? `https://www.dndbeyond.com/character/${resolvedCharacterId}/json` : null,
    initialResponse.ok ? `${initialResponse.url.replace(/\/+$/, "")}/json` : null,
    resolvedCharacterId ? `${publicUrl}/json` : null,
  ].filter((candidateUrl): candidateUrl is string => Boolean(candidateUrl));

  for (const candidateUrl of jsonCandidates) {
    const response = await fetchCandidate(candidateUrl);

    if (!response.ok || !response.contentType.toLowerCase().includes("json")) {
      continue;
    }

    const parsed = safeJsonParse(response.text);
    const characterData = getCharacterDataFromJson(parsed);

    if (!characterData) {
      continue;
    }

    const importedCharacter = buildImportFromCharacterData(characterData, null, publicUrl);

    if (isUsableImport(importedCharacter)) {
      return importedCharacter;
    }
  }

  const htmlCandidates = [...new Set([publicUrl, originalUrl])];

  for (const candidateUrl of htmlCandidates) {
    const response = await fetchCandidate(candidateUrl);

    if (!response.ok) {
      continue;
    }

    const accessProblem = detectDndBeyondAccessProblem(response.text);

    if (accessProblem) {
      throw new Error(accessProblem);
    }

    const payloads = collectJsonScriptPayloads(response.text);

    for (const payload of payloads) {
      const characterData = getCharacterDataFromJson(payload);

      if (!characterData) {
        continue;
      }

      const importedCharacter = buildImportFromCharacterData(
        characterData,
        response.text,
        publicUrl,
      );

      if (isUsableImport(importedCharacter)) {
        return importedCharacter;
      }
    }
  }

  throw new Error(
    "We couldn't read character details from that link. Make sure the character is shared publicly on D&D Beyond and try again.",
  );
}
