import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  const roles = dbUser.roles.map((role: { role: string }) => role.role);
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
    profileImagePath: dbUser.profileImagePath,
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
