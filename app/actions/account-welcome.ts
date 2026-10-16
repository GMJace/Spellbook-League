"use server";

import { auth } from "@/auth";
import { claimAccountWelcome } from "@/lib/account-welcome";
import { prisma } from "@/lib/prisma";

export async function showAccountWelcome() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.roles.some((role) => role === "PLAYER" || role === "DM")) {
    return false;
  }
  return claimAccountWelcome(prisma, user.id);
}
