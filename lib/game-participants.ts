export const TBD_CHARACTER_VALUE = "TBD";
export const TBD_CHARACTER_LABEL = "TBD";
export const TBD_CHARACTER_OPTION_LABEL = "TBD (any tier)";

export function isTbdCharacterValue(value: null | string | undefined) {
  return (value ?? "").trim().toUpperCase() === TBD_CHARACTER_VALUE;
}

export function normalizeParticipantCharacterId(value: null | string | undefined) {
  const trimmed = (value ?? "").trim();

  if (!trimmed || isTbdCharacterValue(trimmed)) {
    return null;
  }

  return trimmed;
}

export function getParticipantCharacterLabel(name: null | string | undefined) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : TBD_CHARACTER_LABEL;
}
