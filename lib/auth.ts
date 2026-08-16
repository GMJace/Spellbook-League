import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { ensureAutomaticAdminRoles } from "@/lib/admin-roles";
import { addPatronRoleFromMembership } from "@/lib/grimoire-guild-membership";
import { prisma } from "@/lib/prisma";

type RequireUserOptions = {
  allowMissingDiscord?: boolean;
};

export async function requireUser(options: RequireUserOptions = {}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { roles: true },
  });

  if (!dbUser) {
    redirect("/login?session=stale");
  }

  const automaticRoles = await ensureAutomaticAdminRoles(
    prisma,
    dbUser.id,
    dbUser.email,
    dbUser.roles.map((role: { role: Role }) => role.role)
  );
  const roles = await addPatronRoleFromMembership(dbUser.id, automaticRoles);
  const missingDiscordHandle =
    roles.some((role) => role === "PLAYER" || role === "DM") &&
    !dbUser.discordHandle?.trim();

  if (missingDiscordHandle && !options.allowMissingDiscord) {
    redirect("/profile?missingDiscord=1");
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    discordHandle: dbUser.discordHandle,
    newGameSignupAlertsEnabled: dbUser.newGameSignupAlertsEnabled,
    profileImagePath: dbUser.profileImagePath,
    storeCreditHeldUsd: dbUser.storeCreditHeldUsd,
    storeCreditUsd: dbUser.storeCreditUsd,
    roles,
    hasPassword: Boolean(dbUser.passwordHash),
  };
}

export async function requireRole(role: "PLAYER" | "DM") {
  const user = await requireUser();

  if (!user.roles.includes(role)) {
    redirect("/");
  }

  return user;
}
