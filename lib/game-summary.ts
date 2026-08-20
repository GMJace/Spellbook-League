import { splitBulletLines } from "@/lib/utils";

const GAME_SUMMARY_MARKER = "[[GAME_SUMMARY]]";
const THEMES_MARKER = "[[THEMES]]";
const CONTENT_ADVISORIES_MARKER = "[[CONTENT_ADVISORIES]]";

export type ParsedGameSummary = {
  contentAdvisories: string[];
  gameSummary: string;
  isStructured: boolean;
  legacyLines: string[];
  themes: string[];
};

function trimSectionValue(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeBulletLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

export function parseStoredGameSummary(value: null | string | undefined): ParsedGameSummary {
  const normalizedValue = trimSectionValue(value ?? "");

  if (!normalizedValue) {
    return {
      contentAdvisories: [],
      gameSummary: "",
      isStructured: false,
      legacyLines: [],
      themes: [],
    };
  }

  const hasStructuredMarkers =
    normalizedValue.includes(GAME_SUMMARY_MARKER) &&
    normalizedValue.includes(THEMES_MARKER) &&
    normalizedValue.includes(CONTENT_ADVISORIES_MARKER);

  if (!hasStructuredMarkers) {
    return {
      contentAdvisories: [],
      gameSummary: normalizedValue,
      isStructured: false,
      legacyLines: splitBulletLines(normalizedValue),
      themes: [],
    };
  }

  const summaryStart = normalizedValue.indexOf(GAME_SUMMARY_MARKER) + GAME_SUMMARY_MARKER.length;
  const themesStart = normalizedValue.indexOf(THEMES_MARKER);
  const advisoriesStart = normalizedValue.indexOf(CONTENT_ADVISORIES_MARKER);

  const summarySection = trimSectionValue(normalizedValue.slice(summaryStart, themesStart));
  const themesSection = trimSectionValue(
    normalizedValue.slice(themesStart + THEMES_MARKER.length, advisoriesStart)
  );
  const contentAdvisoriesSection = trimSectionValue(
    normalizedValue.slice(advisoriesStart + CONTENT_ADVISORIES_MARKER.length)
  );

  return {
    contentAdvisories: normalizeBulletLines(splitBulletLines(contentAdvisoriesSection)),
    gameSummary: summarySection,
    isStructured: true,
    legacyLines: [],
    themes: normalizeBulletLines(splitBulletLines(themesSection)),
  };
}

export function serializeGameSummarySections({
  contentAdvisories,
  gameSummary,
  themes,
}: {
  contentAdvisories: string[];
  gameSummary: string;
  themes: string[];
}) {
  const normalizedSummary = trimSectionValue(gameSummary);
  const normalizedThemes = normalizeBulletLines(themes);
  const normalizedContentAdvisories = normalizeBulletLines(contentAdvisories);

  return [
    GAME_SUMMARY_MARKER,
    normalizedSummary,
    THEMES_MARKER,
    normalizedThemes.map((line) => `• ${line}`).join("\n"),
    CONTENT_ADVISORIES_MARKER,
    normalizedContentAdvisories.map((line) => `• ${line}`).join("\n"),
  ].join("\n");
}
