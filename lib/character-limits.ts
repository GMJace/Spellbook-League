export const STANDARD_CHARACTER_LIMIT = 3;
export const PATRON_CHARACTER_LIMIT = 100;

export function getCharacterLimitForRoles(roles: string[]) {
  return roles.includes("PATRON")
    ? PATRON_CHARACTER_LIMIT
    : STANDARD_CHARACTER_LIMIT;
}

export function getCharacterLimitReachedMessage(limit: number) {
  return `You have reached your character limit of ${limit}.`;
}
