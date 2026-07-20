import type { Role } from "@prisma/client";
import { isAdminEmail } from "@/lib/admin-access";

export const AUTOMATIC_ADMIN_ROLES = [
  "PLAYER",
  "DM",
  "EVENT_ADMIN",
  "PATRON",
] as const;

type AutomaticAdminRole = (typeof AUTOMATIC_ADMIN_ROLES)[number];

type RoleCapableClient = {
  userRole: {
    findMany: (...args: any[]) => Promise<Array<{ role: Role }>>;
    createMany: (...args: any[]) => Promise<unknown>;
  };
};

export function getAutomaticAdminRoles(email: string | null | undefined) {
  return isAdminEmail(email) ? [...AUTOMATIC_ADMIN_ROLES] : [];
}

export function mergeAutomaticAdminRoles(
  email: string | null | undefined,
  roles: Role[]
) {
  return [...new Set([...roles, ...getAutomaticAdminRoles(email)])];
}

export async function ensureAutomaticAdminRoles(
  client: RoleCapableClient,
  userId: string,
  email: string | null | undefined,
  existingRoles?: Role[]
) {
  const automaticRoles = getAutomaticAdminRoles(email);

  if (!automaticRoles.length) {
    return existingRoles ?? [];
  }

  const currentRoles =
    existingRoles ??
    (
      await client.userRole.findMany({
        where: { userId },
        select: { role: true },
      })
    ).map((role) => role.role);

  const missingRoles = automaticRoles.filter((role) => !currentRoles.includes(role));

  if (missingRoles.length) {
    await client.userRole.createMany({
      data: missingRoles.map((role) => ({
        userId,
        role,
      })),
      skipDuplicates: true,
    });
  }

  return [...new Set([...currentRoles, ...automaticRoles])];
}
