import "server-only";

import type { Prisma, TidingAwardRole, TidingSourceType } from "@prisma/client";

import { normalizeAdventureLookupValue } from "@/lib/adventure-catalog";
import { prisma } from "@/lib/prisma";

type TidingDbClient = Prisma.TransactionClient | typeof prisma;

type TidingCandidate = {
  adventureCode: string;
  dmName: string;
  dmUserId: null | string;
  earnedAt: Date;
  playerUserId: string;
  sessionKey: string;
  sourceType: TidingSourceType;
};

type TidingLedgerEntry = {
  amount: number;
  detail: string;
  kind: "earned" | "spent" | "refunded";
  occurredAt: Date;
  roleLabel: string;
};

type AdminTidingRow = {
  availableCount: number;
  earnedCount: number;
  roleLabels: string[];
  spentCount: number;
  userId: string;
  userName: string;
};

type GrimTidingsCheckoutItem = {
  characterId: null | string;
  gameId: string;
  grimTidingCost: number;
};

function parseGrimTidingsCheckoutItems(serializedValue: string) {
  try {
    const parsed = JSON.parse(serializedValue) as {
      games?: Array<{
        characterId?: null | string;
        gameId?: string;
        grimTidingCost?: number;
        isGrimTidings?: boolean;
      }>;
    };

    if (!Array.isArray(parsed?.games)) {
      return [];
    }

    return parsed.games
      .map((item) => {
        if (!item?.isGrimTidings || typeof item.gameId !== "string") {
          return null;
        }

        return {
          characterId:
            typeof item.characterId === "string" && item.characterId.trim()
              ? item.characterId
              : null,
          gameId: item.gameId,
          grimTidingCost:
            typeof item.grimTidingCost === "number" && item.grimTidingCost > 0
              ? item.grimTidingCost
              : 1,
        } satisfies GrimTidingsCheckoutItem;
      })
      .filter((item): item is GrimTidingsCheckoutItem => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeDmName(value: null | string | undefined) {
  return normalizeAdventureLookupValue(value ?? "");
}

function buildTidingSessionKey({
  adventureCode,
  dmName,
  playerUserId,
}: {
  adventureCode: string;
  dmName: string;
  playerUserId: string;
}) {
  return `${normalizeAdventureLookupValue(adventureCode)}::${normalizeDmName(dmName)}::${playerUserId}`;
}

function compareCandidates(left: TidingCandidate, right: TidingCandidate) {
  const timeDifference = left.earnedAt.getTime() - right.earnedAt.getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  if (left.sourceType === right.sourceType) {
    return 0;
  }

  return left.sourceType === "PLAYER_LOG" ? -1 : 1;
}

function buildPlayerManagedCandidate(record: {
  adventureCode: string;
  approvedAt: Date | null;
  createdAt: Date;
  dmName: string | null;
  userId: string;
}): TidingCandidate | null {
  const normalizedAdventureCode = normalizeAdventureLookupValue(record.adventureCode);
  const normalizedDmName = normalizeDmName(record.dmName);

  if (!normalizedAdventureCode || !normalizedDmName) {
    return null;
  }

  return {
    adventureCode: record.adventureCode,
    dmName: record.dmName?.trim() || "Unknown DM",
    dmUserId: null,
    earnedAt: record.approvedAt ?? record.createdAt,
    playerUserId: record.userId,
    sessionKey: buildTidingSessionKey({
      adventureCode: record.adventureCode,
      dmName: record.dmName ?? "",
      playerUserId: record.userId,
    }),
    sourceType: "PLAYER_LOG",
  };
}

function buildDmManagedCandidate(record: {
  adventureCode: string;
  approvedAt: Date | null;
  createdAt: Date;
  dmId: string | null;
  dmName: string | null;
  dmUser: null | { name: string };
  userId: string;
}): TidingCandidate | null {
  const resolvedDmName = record.dmUser?.name ?? record.dmName ?? "";
  const normalizedAdventureCode = normalizeAdventureLookupValue(record.adventureCode);
  const normalizedDm = normalizeDmName(resolvedDmName);

  if (!normalizedAdventureCode || !normalizedDm) {
    return null;
  }

  return {
    adventureCode: record.adventureCode,
    dmName: resolvedDmName.trim(),
    dmUserId: record.dmId,
    earnedAt: record.approvedAt ?? record.createdAt,
    playerUserId: record.userId,
    sessionKey: buildTidingSessionKey({
      adventureCode: record.adventureCode,
      dmName: resolvedDmName,
      playerUserId: record.userId,
    }),
    sourceType: "DM_LOG",
  };
}

async function buildCurrentTidingAwards(db: TidingDbClient) {
  const approvedParticipants = await db.gameParticipant.findMany({
    where: {
      logStatus: "APPROVED",
      game: {
        status: "COMPLETED",
      },
    },
    select: {
      approvedAt: true,
      createdAt: true,
      userId: true,
      game: {
        select: {
          adventureCode: true,
          dmId: true,
          dmName: true,
          dm: {
            select: {
              name: true,
            },
          },
          loggedByUserId: true,
        },
      },
    },
  });

  const earliestBySessionKey = new Map<string, TidingCandidate>();

  for (const participant of approvedParticipants) {
    const candidate =
      participant.game.loggedByUserId === participant.userId
        ? buildPlayerManagedCandidate({
            adventureCode: participant.game.adventureCode,
            approvedAt: participant.approvedAt,
            createdAt: participant.createdAt,
            dmName: participant.game.dmName,
            userId: participant.userId,
          })
        : buildDmManagedCandidate({
            adventureCode: participant.game.adventureCode,
            approvedAt: participant.approvedAt,
            createdAt: participant.createdAt,
            dmId: participant.game.dmId,
            dmName: participant.game.dmName,
            dmUser: participant.game.dm,
            userId: participant.userId,
          });

    if (!candidate) {
      continue;
    }

    const existing = earliestBySessionKey.get(candidate.sessionKey);

    if (!existing || compareCandidates(candidate, existing) < 0) {
      earliestBySessionKey.set(candidate.sessionKey, candidate);
    }
  }

  return Array.from(earliestBySessionKey.values()).flatMap((candidate) => {
    const awards: Array<{
      adventureCode: string;
      dmName: string;
      dmUserId: null | string;
      earnedAt: Date;
      playerUserId: string;
      role: TidingAwardRole;
      sessionKey: string;
      sourceType: TidingSourceType;
      userId: string;
    }> = [
      {
        adventureCode: candidate.adventureCode,
        dmName: candidate.dmName,
        dmUserId: candidate.dmUserId,
        earnedAt: candidate.earnedAt,
        playerUserId: candidate.playerUserId,
        role: "PLAYER",
        sessionKey: candidate.sessionKey,
        sourceType: candidate.sourceType,
        userId: candidate.playerUserId,
      },
    ];

    if (candidate.sourceType === "DM_LOG" && candidate.dmUserId) {
      awards.push({
        adventureCode: candidate.adventureCode,
        dmName: candidate.dmName,
        dmUserId: candidate.dmUserId,
        earnedAt: candidate.earnedAt,
        playerUserId: candidate.playerUserId,
        role: "DM",
        sessionKey: candidate.sessionKey,
        sourceType: candidate.sourceType,
        userId: candidate.dmUserId,
      });
    }

    return awards;
  });
}

export async function rebuildTidingAwards(db: TidingDbClient = prisma) {
  const awards = await buildCurrentTidingAwards(db);

  await db.tidingAward.deleteMany();

  if (!awards.length) {
    return;
  }

  await db.tidingAward.createMany({
    data: awards,
  });
}

export async function getUserTidingSummary(userId: string) {
  const [earnedCount, activeSpends] = await Promise.all([
    prisma.tidingAward.count({
      where: {
        userId,
      },
    }),
    prisma.tidingSpend.findMany({
      where: {
        userId,
        refundedAt: null,
      },
      select: {
        amount: true,
      },
    }),
  ]);

  const spentCount = activeSpends.reduce((total, spend) => total + spend.amount, 0);

  return {
    availableCount: Math.max(earnedCount - spentCount, 0),
    earnedCount,
    spentCount,
  };
}

export async function getUserTidingLedger(userId: string): Promise<TidingLedgerEntry[]> {
  const [awards, spends] = await Promise.all([
    prisma.tidingAward.findMany({
      where: {
        userId,
      },
      orderBy: {
        earnedAt: "desc",
      },
    }),
    prisma.tidingSpend.findMany({
      where: {
        userId,
      },
      include: {
        game: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        spentAt: "desc",
      },
    }),
  ]);

  const awardEntries: TidingLedgerEntry[] = awards.map((award) => ({
    amount: 1,
    detail: `${award.adventureCode} with ${award.dmName}`,
    kind: "earned",
    occurredAt: award.earnedAt,
    roleLabel: award.role === "DM" ? "DM Tiding" : "Player Tiding",
  }));
  const spendEntries: TidingLedgerEntry[] = spends.flatMap((spend) => {
    const detail = spend.sourceLabel || spend.game?.title || spend.reason;
    const entries: TidingLedgerEntry[] = [
      {
        amount: spend.amount,
        detail,
        kind: "spent",
        occurredAt: spend.spentAt,
        roleLabel: "Grim Tidings access",
      },
    ];

    if (spend.refundedAt) {
      entries.push({
        amount: spend.amount,
        detail,
        kind: "refunded",
        occurredAt: spend.refundedAt,
        roleLabel: "Grim Tidings refund",
      });
    }

    return entries;
  });

  return [...awardEntries, ...spendEntries].sort(
    (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
  );
}

export async function getAdminTidingRows(): Promise<AdminTidingRow[]> {
  const [users, earnedGroups, spentGroups] = await Promise.all([
    prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              in: ["PLAYER", "DM"],
            },
          },
        },
      },
      include: {
        roles: {
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.tidingAward.groupBy({
      by: ["userId"],
      _count: {
        _all: true,
      },
    }),
    prisma.tidingSpend.groupBy({
      by: ["userId"],
      where: {
        refundedAt: null,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const earnedMap = new Map(earnedGroups.map((group) => [group.userId, group._count._all]));
  const spentMap = new Map(spentGroups.map((group) => [group.userId, group._sum.amount ?? 0]));

  return users
    .map((user) => {
      const earnedCount = earnedMap.get(user.id) ?? 0;
      const spentCount = spentMap.get(user.id) ?? 0;

      return {
        availableCount: Math.max(earnedCount - spentCount, 0),
        earnedCount,
        roleLabels: user.roles.map((role) => role.role.replace(/_/g, " ")),
        spentCount,
        userId: user.id,
        userName: user.name,
      };
    })
    .sort(
      (left, right) =>
        right.availableCount - left.availableCount ||
        right.earnedCount - left.earnedCount ||
        left.userName.localeCompare(right.userName),
    );
}

export async function spendTidingsForGame(
  db: TidingDbClient,
  params: {
    amount: number;
    gameId: string;
    reason: string;
    sourceLabel: string;
    userId: string;
  },
) {
  const existingSpend = await db.tidingSpend.findFirst({
    where: {
      gameId: params.gameId,
      refundedAt: null,
      userId: params.userId,
    },
    select: {
      amount: true,
      id: true,
    },
  });

  if (existingSpend) {
    return existingSpend;
  }

  const [earnedCount, activeSpends] = await Promise.all([
    db.tidingAward.count({
      where: {
        userId: params.userId,
      },
    }),
    db.tidingSpend.findMany({
      where: {
        refundedAt: null,
        userId: params.userId,
      },
      select: {
        amount: true,
      },
    }),
  ]);

  const spentCount = activeSpends.reduce((total, spend) => total + spend.amount, 0);
  const availableCount = earnedCount - spentCount;

  if (availableCount < params.amount) {
    throw new Error("INSUFFICIENT_TIDINGS");
  }

  return db.tidingSpend.create({
    data: {
      amount: params.amount,
      gameId: params.gameId,
      reason: params.reason,
      sourceLabel: params.sourceLabel,
      userId: params.userId,
    },
  });
}

export async function refundTidingsForGame(
  db: TidingDbClient,
  params: {
    gameId: string;
    userId: string;
  },
) {
  await db.tidingSpend.updateMany({
    where: {
      gameId: params.gameId,
      refundedAt: null,
      userId: params.userId,
    },
    data: {
      refundedAt: new Date(),
    },
  });
}

export async function processCompletedGrimTidingsCheckout(
  db: TidingDbClient,
  params: {
    itemDataJson: string;
    userId: string;
  },
) {
  const grimItems = parseGrimTidingsCheckoutItems(params.itemDataJson);

  if (!grimItems.length) {
    return;
  }

  for (const item of grimItems) {
    const [existingParticipant, game] = await Promise.all([
      db.gameParticipant.findFirst({
        where: {
          gameId: item.gameId,
          userId: params.userId,
        },
        select: {
          id: true,
        },
      }),
      db.game.findUnique({
        where: {
          id: item.gameId,
        },
        select: {
          adventureCode: true,
          grimTidingCost: true,
          id: true,
          isGrimTidings: true,
          seatCapacity: true,
          status: true,
          title: true,
          _count: {
            select: {
              participants: true,
            },
          },
        },
      }),
    ]);

    if (existingParticipant) {
      continue;
    }

    if (!game || !game.isGrimTidings || game.status !== "SCHEDULED") {
      throw new Error("One or more Grim Tidings games are no longer available.");
    }

    const openSeats = Math.max(game.seatCapacity - game._count.participants, 0);

    if (openSeats <= 0) {
      throw new Error(`${game.title} is already full.`);
    }

    await spendTidingsForGame(db, {
      amount: Math.max(item.grimTidingCost || game.grimTidingCost || 1, 1),
      gameId: game.id,
      reason: "Grim Tidings cart checkout",
      sourceLabel: `${game.title} (${game.adventureCode})`,
      userId: params.userId,
    });

    await db.gameParticipant.create({
      data: {
        approvedAt: null,
        characterId: item.characterId,
        gameId: game.id,
        logConsumablesAwarded: null,
        logMagicItemsAwarded: null,
        logRewardsSummary: null,
        logSessionNotes: null,
        logStatus: "APPROVED",
        userId: params.userId,
      },
    });
  }
}
