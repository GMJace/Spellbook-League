import "server-only";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const GRIMOIRE_GUILD_MEMBERSHIP_SETTINGS_ID = "grimoire-guild-membership";
export const DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_NAME = "Grimoire Guild membership";
export const DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_DESCRIPTION =
  "Adds one year of Patron access and raises your character logsheet limit to 100.";
export const DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_PRICE_USD = 15;
export const DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_DURATION_DAYS = 365;

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export async function getGrimoireGuildMembershipSettings() {
  return prisma.grimoireGuildMembershipSettings.upsert({
    where: {
      id: GRIMOIRE_GUILD_MEMBERSHIP_SETTINGS_ID,
    },
    update: {},
    create: {
      id: GRIMOIRE_GUILD_MEMBERSHIP_SETTINGS_ID,
      productName: DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_NAME,
      description: DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_DESCRIPTION,
      priceUsd: DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_PRICE_USD,
      durationDays: DEFAULT_GRIMOIRE_GUILD_MEMBERSHIP_DURATION_DAYS,
      isActive: true,
    },
  });
}

export async function getPatronMembershipOverviewForUser(userId: string) {
  const now = new Date();
  const [activeMembership, furthestMembership] = await Promise.all([
    prisma.patronMembership.findFirst({
      where: {
        userId,
        startedAt: {
          lte: now,
        },
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        expiresAt: "desc",
      },
    }),
    prisma.patronMembership.findFirst({
      where: {
        userId,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        expiresAt: "desc",
      },
    }),
  ]);

  return {
    accessEndsAt: furthestMembership?.expiresAt ?? null,
    activeMembership,
    hasActivePatronAccess: Boolean(activeMembership),
  };
}

export async function addPatronRoleFromMembership(
  userId: string,
  roles: Role[]
): Promise<Role[]> {
  if (roles.includes("PATRON")) {
    return roles;
  }

  const membership = await prisma.patronMembership.findFirst({
    where: {
      userId,
      startedAt: {
        lte: new Date(),
      },
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  return membership ? [...roles, "PATRON"] : roles;
}

export async function grantGrimoireGuildMembership(params: {
  checkoutOrderId: string;
  durationDays: number;
  productName: string;
  userId: string;
}) {
  const existingMembership = await prisma.patronMembership.findUnique({
    where: {
      checkoutOrderId: params.checkoutOrderId,
    },
  });

  if (existingMembership) {
    return existingMembership;
  }

  const now = new Date();
  const latestFutureMembership = await prisma.patronMembership.findFirst({
    where: {
      userId: params.userId,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      expiresAt: "desc",
    },
  });
  const startedAt =
    latestFutureMembership?.expiresAt && latestFutureMembership.expiresAt > now
      ? latestFutureMembership.expiresAt
      : now;
  const expiresAt = addDays(startedAt, params.durationDays);

  return prisma.patronMembership.create({
    data: {
      userId: params.userId,
      checkoutOrderId: params.checkoutOrderId,
      productName: params.productName,
      source: "LEAGUE_CART",
      startedAt,
      expiresAt,
    },
  });
}

export async function getAdminPatronMembershipRows() {
  const memberships = await prisma.patronMembership.findMany({
    where: {
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      checkoutOrder: {
        select: {
          paypalOrderId: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: [{ userId: "asc" }, { expiresAt: "desc" }],
  });
  const now = Date.now();
  const rows = new Map<
    string,
    {
      accessEndsAt: Date;
      checkoutOrderId: string | null;
      displayName: string;
      email: string;
      hasActivePatronAccess: boolean;
      productName: string;
      startedAt: Date;
      userId: string;
    }
  >();
  const membershipsByUser = new Map<string, typeof memberships>();

  for (const membership of memberships) {
    const userMemberships = membershipsByUser.get(membership.userId) ?? [];
    userMemberships.push(membership);
    membershipsByUser.set(membership.userId, userMemberships);
  }

  for (const membership of memberships) {
    if (rows.has(membership.userId)) {
      continue;
    }

    const userMemberships = membershipsByUser.get(membership.userId) ?? [membership];
    const latestExpiry = userMemberships.reduce(
      (latest, entry) =>
        entry.expiresAt.getTime() > latest.getTime() ? entry.expiresAt : latest,
      membership.expiresAt
    );
    const earliestStart = userMemberships.reduce(
      (earliest, entry) =>
        entry.startedAt.getTime() < earliest.getTime() ? entry.startedAt : earliest,
      membership.startedAt
    );
    const hasActivePatronAccess = userMemberships.some(
      (entry) =>
        entry.startedAt.getTime() <= now && entry.expiresAt.getTime() > now
    );

    rows.set(membership.userId, {
      accessEndsAt: latestExpiry,
      checkoutOrderId: membership.checkoutOrder?.paypalOrderId ?? null,
      displayName: membership.user.name,
      email: membership.user.email,
      hasActivePatronAccess,
      productName: membership.productName,
      startedAt: earliestStart,
      userId: membership.userId,
    });
  }

  return [...rows.values()].sort(
    (left, right) => right.accessEndsAt.getTime() - left.accessEndsAt.getTime()
  );
}
