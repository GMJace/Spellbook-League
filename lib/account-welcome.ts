import type { PrismaClient } from "@prisma/client";

// One atomic update prevents two tabs or devices from both claiming the welcome.
export async function claimAccountWelcome(
  db: Pick<PrismaClient, "accountWelcome">,
  userId: string,
) {
  const result = await db.accountWelcome.updateMany({
    where: { userId, shownAt: null },
    data: { shownAt: new Date() },
  });
  return result.count === 1;
}
