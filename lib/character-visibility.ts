import { getProDmRosterEntry } from "@/lib/pro-dm-roster";
import { isAdminEmail } from "@/lib/admin-access";

const ADMIN_ROLES = new Set(["LEAGUE_ADMIN", "EVENT_ADMIN"]);

export function isCharacterRosterAdmin(roles: string[]) {
  return roles.some((role) => ADMIN_ROLES.has(role));
}

export async function canViewPrivateCharacterRoster(user: {
  id: string;
  roles: string[];
  email?: string;
}) {
  if (isCharacterRosterAdmin(user.roles) || (user.email && isAdminEmail(user.email))) {
    return true;
  }

  if (!user.roles.includes("DM")) {
    return false;
  }

  return (await getProDmRosterEntry(user.id)) !== null;
}

export function canViewPublicCharacterRoster(user: { roles: string[]; email?: string }) {
  return (
    user.roles.includes("PLAYER") ||
    user.roles.includes("DM") ||
    isCharacterRosterAdmin(user.roles) ||
    Boolean(user.email && isAdminEmail(user.email))
  );
}
