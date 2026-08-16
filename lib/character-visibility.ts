import { getProDmRosterEntry } from "@/lib/pro-dm-roster";

const ADMIN_ROLES = new Set(["LEAGUE_ADMIN", "EVENT_ADMIN"]);

export function isCharacterRosterAdmin(roles: string[]) {
  return roles.some((role) => ADMIN_ROLES.has(role));
}

export async function canViewPrivateCharacterRoster(user: {
  id: string;
  roles: string[];
}) {
  if (isCharacterRosterAdmin(user.roles)) {
    return true;
  }

  if (!user.roles.includes("DM")) {
    return false;
  }

  return (await getProDmRosterEntry(user.id)) !== null;
}

export function canViewPublicCharacterRoster(user: { roles: string[] }) {
  return (
    user.roles.includes("PLAYER") ||
    user.roles.includes("DM") ||
    isCharacterRosterAdmin(user.roles)
  );
}
