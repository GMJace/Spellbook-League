"use client";

import { CharacterBuild, getCharacterBuildEntries } from "@/lib/character";

type CharacterBuildDisplayProps = {
  character: CharacterBuild;
  className?: string;
  compact?: boolean;
  emptyLabel?: string;
};

export function CharacterBuildDisplay({
  character,
  className,
  compact = false,
  emptyLabel = "No classes recorded",
}: CharacterBuildDisplayProps) {
  const entries = getCharacterBuildEntries(character);

  if (!entries.length) {
    return <span className="muted">{emptyLabel}</span>;
  }

  return (
    <div
      className={[
        "character-build-display",
        compact ? "character-build-display-compact" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {entries.map((entry) => (
        <div className="character-build-entry" key={`${entry.className}-${entry.level}-${entry.subclassName ?? "base"}`}>
          <div className="character-build-class-row">
            <span>{entry.className}</span>
            <span className="character-build-level">Level {entry.level}</span>
          </div>
          {entry.subclassName ? (
            <span className="character-build-subclass">{entry.subclassName}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
