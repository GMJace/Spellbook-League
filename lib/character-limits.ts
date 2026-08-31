export const STANDARD_CHARACTER_LIMIT = 3;
export const PATRON_CHARACTER_LIMIT = 100;

const PATRON_CHARACTER_LIMIT_ROLES = new Set([
  "PATRON",
  "EVENT_ADMIN",
  "LEAGUE_ADMIN",
]);

export function hasPatronCharacterLimit(roles: string[]) {
  return roles.some((role) => PATRON_CHARACTER_LIMIT_ROLES.has(role));
}

export function getCharacterLimitForRoles(roles: string[]) {
  return hasPatronCharacterLimit(roles)
    ? PATRON_CHARACTER_LIMIT
    : STANDARD_CHARACTER_LIMIT;
}

export function getCharacterLimitReachedMessage(limit: number) {
  return `You have reached your character limit of ${limit}.`;
}
