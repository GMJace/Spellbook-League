// @ts-nocheck
"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createNotifications } from "@/lib/notifications";
import { requireRole } from "@/lib/auth";
import { getParticipantCharacterLabel } from "@/lib/game-participants";
import {
  buildStoredGameRewardStrings,
  hasStructuredGameRewardSelectionFields,
  readGameRewardSelectionsFromFormData,
} from "@/lib/game-reward-selections";
import { convertImageFileToDataUrl } from "@/lib/image-data-url";
import { syncPendingAdventureModuleFromPlayerLog } from "@/lib/pending-adventure-modules";
import { prisma } from "@/lib/prisma";
import { rebuildTidingAwards } from "@/lib/tidings";
import { sendNewGameSignupAlertEmail } from "@/lib/transactional-email";
import { gameParticipantsSchema, gameSchema } from "@/lib/validation";
import { formatTier, isPaidTicketPrice } from "@/lib/utils";

const MAX_ADVENTURE_IMAGE_SIZE = 5 * 1024 * 1024;
const TICKET_ACCESS_CODE_HASH_ROUNDS = 10;

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatNotificationDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const GAME_FIELD_LABELS: Record<string, string> = {
  title: "Game title",
  adventureCode: "Adventure code",
  source: "Source",
  gameSummary: "Game summary",
  ticketPrice: "Price",
  isGrimTidings: "Grim Tidings game",
  grimTidingCost: "Tiding cost",
  ticketAccessCode: "Ticket access code",
  datePlayed: "Date and time",
  duration: "Duration",
  tier: "Tier",
  seatCapacity: "Player capacity",
  rewardsSummary: "Awarded Gold",
  spellbookAwarded: "Spellbooks awarded",
  sessionNotes: "Session notes/Story Awards",
  status: "Status",
};

type GameFieldName =
  | "title"
  | "adventureCode"
  | "source"
  | "gameSummary"
  | "ticketPrice"
  | "isGrimTidings"
  | "grimTidingCost"
  | "ticketAccessCode"
  | "datePlayed"
  | "duration"
  | "tier"
  | "seatCapacity"
  | "serviceHours"
  | "downtimeDaysAwarded"
  | "rewardsSummary"
  | "magicItemsAwarded"
  | "consumablesAwarded"
  | "spellbookAwarded"
  | "sessionNotes"
  | "status"
  | "participants"
  | "adventureImage";

type GameActionErrorResult = {
  error: string;
  fieldErrors?: Partial<Record<GameFieldName, string>>;
};

const GAME_FIELD_ERROR_MESSAGES: Record<GameFieldName, string> = {
  title: "Enter a game title.",
  adventureCode: "Enter an adventure code.",
  source: "Source must be 160 characters or fewer.",
  gameSummary: "Game summary must be 1500 characters or fewer.",
  ticketPrice: 'Enter a price such as "Free" or "$15 USD".',
  isGrimTidings: "Choose whether this is a Grim Tidings game.",
  grimTidingCost: "Tiding cost must be between 1 and 99.",
  ticketAccessCode: "Ticket access code must be at least 4 characters and 100 characters or fewer.",
  datePlayed: "Choose a valid game date and time.",
  duration: "Duration must be 80 characters or fewer.",
  tier: "Choose a valid tier.",
  seatCapacity: "Player capacity must be between 1 and 12.",
  serviceHours: "Service hours must be a number between 0 and 999.",
  downtimeDaysAwarded: "Downtime days awarded must be a whole number between 0 and 999.",
  rewardsSummary: "Enter the awarded gold total.",
  magicItemsAwarded: "Magic items awarded must be 1500 characters or fewer.",
  consumablesAwarded: "Consumables awarded must be 500 characters or fewer.",
  spellbookAwarded: "Spellbooks awarded must be 1500 characters or fewer.",
  sessionNotes: "Enter the session notes or story awards.",
  status: "Choose a valid game status.",
  participants: "Review the participants list and try again.",
  adventureImage: "Review the adventure cover image and try again.",
};

function buildGameValidationErrorResult(
  issues: Array<{ path?: Array<string | number>; message?: string }>
) : GameActionErrorResult {
  const fieldErrors: Partial<Record<GameFieldName, string>> = {};
  const fields = Array.from(
    new Set(
      issues
        .map((issue) => {
          const path = issue.path?.[0];

          if (typeof path !== "string") {
            return null;
          }

          const field = path as GameFieldName;
          const explicitMessage = issue.message?.trim();

          if (explicitMessage && Object.values(GAME_FIELD_LABELS).includes(explicitMessage)) {
            if (!fieldErrors[field]) {
              fieldErrors[field] = GAME_FIELD_ERROR_MESSAGES[field];
            }

            return explicitMessage;
          }

          if (!fieldErrors[field]) {
            fieldErrors[field] =
              GAME_FIELD_ERROR_MESSAGES[field] ??
              explicitMessage ??
              `Review ${GAME_FIELD_LABELS[field] ?? "this field"} and try again.`;
          }

          return GAME_FIELD_LABELS[field] ?? null;
        })
        .filter((field): field is string => Boolean(field))
    )
  );

  if (fields.length === 1) {
    return {
      error: `Please fix this field: ${fields[0]}.`,
      fieldErrors,
    };
  }

  if (fields.length > 1) {
    return {
      error: `Please fix these fields: ${fields.join(", ")}.`,
      fieldErrors,
    };
  }

  return {
    error: "Please fix the highlighted game fields and try again.",
    fieldErrors,
  };
}

function buildParticipantSummaries(
  participants: Array<{ userId: string; characterId: null | string }>,
  playerMap: Map<string, { name: string; characters: Array<{ id: string; name: string }> }>
) {
  const grouped = new Map<
    string,
    { userId: string; userName: string; firstCharacterId: null | string; characterNames: string[] }
  >();

  for (const participant of participants) {
    const player = playerMap.get(participant.userId);
    const character = participant.characterId
      ? player?.characters.find((entry) => entry.id === participant.characterId)
      : null;

    if (!player) {
      continue;
    }

    const existing =
      grouped.get(participant.userId) ??
      {
        userId: participant.userId,
        userName: player.name,
        firstCharacterId: participant.characterId,
        characterNames: [],
      };

    if (!existing.firstCharacterId && participant.characterId) {
      existing.firstCharacterId = participant.characterId;
    }

    existing.characterNames.push(getParticipantCharacterLabel(character?.name));
    grouped.set(participant.userId, existing);
  }

  return Array.from(grouped.values());
}

function buildExistingParticipantSummaries(
  participants: Array<{
    userId: string;
    characterId: null | string;
    user: { name: string };
    character: null | { name: string };
  }>
) {
  const grouped = new Map<
    string,
    { userId: string; userName: string; firstCharacterId: null | string; characterNames: string[] }
  >();

  for (const participant of participants) {
    const existing =
      grouped.get(participant.userId) ??
      {
        userId: participant.userId,
        userName: participant.user.name,
        firstCharacterId: participant.characterId,
        characterNames: [],
      };

    if (!existing.firstCharacterId && participant.characterId) {
      existing.firstCharacterId = participant.characterId;
    }

    existing.characterNames.push(getParticipantCharacterLabel(participant.character?.name));
    grouped.set(participant.userId, existing);
  }

  return Array.from(grouped.values());
}

function getParticipantLogData(gameData: {
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  spellbookAwarded: string;
  sessionNotes: string;
}) {
  if (gameData.status === "COMPLETED") {
    return {
      logStatus: "PENDING" as const,
      approvedAt: null,
      logRewardsSummary: gameData.rewardsSummary,
      logMagicItemsAwarded: gameData.magicItemsAwarded,
      logConsumablesAwarded: gameData.consumablesAwarded,
      logSpellbookAwarded: gameData.spellbookAwarded,
      logSessionNotes: gameData.sessionNotes,
    };
  }

  return {
    logStatus: "APPROVED" as const,
    approvedAt: null,
    logRewardsSummary: null,
    logMagicItemsAwarded: null,
    logConsumablesAwarded: null,
    logSpellbookAwarded: null,
    logSessionNotes: null,
  };
}

async function saveAdventureImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return { error: "Adventure art must be an image file." } as const;
  }

  if (file.size > MAX_ADVENTURE_IMAGE_SIZE) {
    return { error: "Adventure art must be 5 MB or smaller." } as const;
  }

  return { path: await convertImageFileToDataUrl(file) } as const;
}

async function parseGameForm(formData: FormData) {
  const rewardStrings = hasStructuredGameRewardSelectionFields(formData)
    ? buildStoredGameRewardStrings(readGameRewardSelectionsFromFormData(formData))
    : {
        magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
        consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
      };
  const participantsRaw = String(formData.get("participants") ?? "[]");
  let parsedParticipantsSource: unknown = [];

  try {
    parsedParticipantsSource = JSON.parse(participantsRaw);
  } catch {
    return {
      error: "Please review the participants section and try again.",
      fieldErrors: {
        participants: GAME_FIELD_ERROR_MESSAGES.participants,
      },
    } as const;
  }

  const participantsResult = gameParticipantsSchema.safeParse(parsedParticipantsSource);

  if (!participantsResult.success) {
    return {
      error: "Please review the participants section and try again.",
      fieldErrors: {
        participants: GAME_FIELD_ERROR_MESSAGES.participants,
      },
    } as const;
  }

  const parsed = gameSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    adventureCode: String(formData.get("adventureCode") ?? ""),
    source: String(formData.get("source") ?? ""),
    gameSummary: String(formData.get("gameSummary") ?? ""),
    ticketPrice: String(formData.get("ticketPrice") ?? "Free"),
    isGrimTidings: formData.get("isGrimTidings") === "on",
    grimTidingCost: String(formData.get("grimTidingCost") ?? "1"),
    ticketAccessCode: String(formData.get("ticketAccessCode") ?? ""),
    datePlayed: String(formData.get("datePlayed") ?? ""),
    duration: String(formData.get("duration") ?? ""),
    tier: String(formData.get("tier") ?? "TIER_1"),
    seatCapacity: String(formData.get("seatCapacity") ?? "6"),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    downtimeDaysAwarded: String(formData.get("downtimeDaysAwarded") ?? "0"),
    rewardsSummary: String(formData.get("rewardsSummary") ?? ""),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    spellbookAwarded: String(formData.get("spellbookAwarded") ?? ""),
    sessionNotes: String(formData.get("sessionNotes") ?? ""),
    status: String(formData.get("status") ?? "SCHEDULED"),
    participants: participantsResult.data,
  });

  if (!parsed.success) {
    return buildGameValidationErrorResult(parsed.error.issues) as const;
  }

  if (parsed.data.isGrimTidings && isPaidTicketPrice(parsed.data.ticketPrice)) {
    return {
      error: "Grim Tidings games must use free signup so players can spend Tidings instead of checking out.",
      fieldErrors: {
        ticketPrice: "Grim Tidings games must use the Free price option.",
        isGrimTidings: GAME_FIELD_ERROR_MESSAGES.isGrimTidings,
      },
    } as const;
  }

  const seenCharacterIds = new Set<string>();

  for (const participant of parsed.data.participants) {
    if (participant.characterId && seenCharacterIds.has(participant.characterId)) {
      return {
        error: "A character cannot be added to the same game twice.",
        fieldErrors: {
          participants: "A character cannot be added to the same game twice.",
        },
      } as const;
    }

    if (participant.characterId) {
      seenCharacterIds.add(participant.characterId);
    }
  }

  const players = await prisma.user.findMany({
    where: {
      id: { in: parsed.data.participants.map((participant) => participant.userId) },
    },
    include: {
      roles: true,
      characters: true,
    },
  });

  const playerMap = new Map(players.map((player) => [player.id, player]));

  for (const participant of parsed.data.participants) {
    const selectedUser = playerMap.get(participant.userId);
    const hasRole = selectedUser?.roles.some((role) => role.role === "PLAYER");
    const ownsCharacter = participant.characterId
      ? selectedUser?.characters.some((character) => character.id === participant.characterId)
      : true;

    if (!selectedUser || !hasRole || !ownsCharacter) {
      return {
        error: "One or more selected participants are invalid.",
        fieldErrors: {
          participants: "One or more selected participants are invalid.",
        },
      } as const;
    }
  }

  return { data: parsed.data, playerMap } as const;
}

async function requireOwnedGame(gameId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const isDm = currentUser.roles.some((entry: { role: string }) => entry.role === "DM");

  if (!isDm) {
    redirect("/");
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      dmId: true,
      adventureImagePath: true,
      grimTidingCost: true,
      isGrimTidings: true,
      ticketAccessCodeHash: true,
    },
  });

  if (!game || game.dmId !== currentUser.id) {
    redirect("/dm");
  }

  return { currentUser, game };
}

async function resolveTicketAccessCodeHash({
  clearRequested,
  existingHash = null,
  ticketAccessCode,
  ticketPrice,
}: {
  clearRequested: boolean;
  existingHash?: null | string;
  ticketAccessCode: string;
  ticketPrice: string;
}) {
  if (!isPaidTicketPrice(ticketPrice) || clearRequested) {
    return null;
  }

  if (!ticketAccessCode.trim()) {
    return existingHash;
  }

  return bcrypt.hash(ticketAccessCode.trim(), TICKET_ACCESS_CODE_HASH_ROUNDS);
}

export async function createGame(formData: FormData) {
  const user = await requireRole("DM");
  const parsed = await parseGameForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const ticketAccessCodeHash = await resolveTicketAccessCodeHash({
    clearRequested: String(formData.get("clearTicketAccessCode") ?? "").trim() === "true",
    ticketAccessCode: parsed.data.ticketAccessCode,
    ticketPrice: parsed.data.ticketPrice,
  });

  const adventureImageFile = formData.get("adventureImage");
  const reuseAdventureImagePath = String(formData.get("reuseAdventureImagePath") ?? "").trim();
  let adventureImagePath: string | null = reuseAdventureImagePath || null;

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return {
        error: uploadResult.error,
        fieldErrors: {
          adventureImage: uploadResult.error,
        },
      };
    }

    adventureImagePath = uploadResult.path;
  }

  const participantLogData = getParticipantLogData(parsed.data);
  const participantSummaries = buildParticipantSummaries(
    parsed.data.participants,
    parsed.playerMap
  );
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);
  const formattedDateTime = formatNotificationDateTime(parsed.data.datePlayed);
  const participantUserIds = Array.from(
    new Set(
      participantSummaries
        .map((participant) => participant.userId)
        .filter((userId): userId is string => Boolean(userId))
    )
  );

  const game = await prisma.$transaction(async (tx) => {
    const createdGame = await tx.game.create({
      data: {
        dmId: user.id,
        loggedByUserId: user.id,
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        source: parsed.data.source,
        gameSummary: parsed.data.gameSummary,
        ticketPrice: parsed.data.ticketPrice,
        isGrimTidings: parsed.data.isGrimTidings,
        grimTidingCost: parsed.data.grimTidingCost,
        ticketAccessCodeHash,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        duration: parsed.data.duration,
        tier: parsed.data.tier,
        seatCapacity: parsed.data.seatCapacity,
        serviceHours: parsed.data.serviceHours,
        downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        rewardsSummary: parsed.data.rewardsSummary,
        magicItemsAwarded: parsed.data.magicItemsAwarded,
        consumablesAwarded: parsed.data.consumablesAwarded,
        spellbookAwarded: parsed.data.spellbookAwarded,
        consequencesSummary: "",
        sessionNotes: parsed.data.sessionNotes,
        status: parsed.data.status,
      },
    });

    if (parsed.data.participants.length) {
      await tx.gameParticipant.createMany({
        data: parsed.data.participants.map((participant) => ({
          gameId: createdGame.id,
          characterId: participant.characterId,
          userId: participant.userId,
          ...participantLogData,
        })),
      });
    }

    const availableSpots = Math.max(
      (parsed.data.seatCapacity ?? 0) - parsed.data.participants.length,
      0,
    );
    const shouldSendSignupAlerts =
      parsed.data.status === "SCHEDULED" &&
      new Date(parsed.data.datePlayed).getTime() > Date.now() &&
      availableSpots > 0;
    const signupAlertRecipients = shouldSendSignupAlerts
      ? await tx.user.findMany({
          where: {
            id: {
              notIn: [user.id, ...participantUserIds],
            },
            newGameSignupAlertsEnabled: true,
            roles: {
              some: {
                role: "PLAYER",
              },
            },
          },
          select: {
            email: true,
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : [];

    await createNotifications(tx, [
      {
        userId: user.id,
        createdByUserId: user.id,
        type: "GAME_CREATED",
        title: `Game created: ${parsed.data.title}`,
        body: `You created ${parsed.data.title} and registered ${participantSummaries.length} participant${participantSummaries.length === 1 ? "" : "s"}.`,
        details: [
          { label: "Adventure", value: parsed.data.adventureCode },
          { label: "Date", value: formattedDate },
          { label: "Status", value: parsed.data.status },
          { label: "Players", value: String(participantSummaries.length) },
        ],
        actionLabel: "View game",
        actionHref: `/dm/games/${createdGame.id}`,
      },
      ...participantSummaries
        .filter((participant) => participant.userId !== user.id)
        .map((participant) => ({
          userId: participant.userId,
          createdByUserId: user.id,
          type: "GAME_CREATED" as const,
          title: `Game signup confirmed: ${parsed.data.title}`,
          body: `${user.name} added ${participant.characterNames.join(", ")} to ${parsed.data.title}.`,
          details: [
            { label: "Adventure", value: parsed.data.adventureCode },
            { label: "Date", value: formattedDate },
            { label: "Characters", value: participant.characterNames.join(", ") },
            { label: "Status", value: parsed.data.status },
          ],
          actionLabel: participant.firstCharacterId ? "Open character" : "View game",
          actionHref: participant.firstCharacterId
            ? `/player/characters/${participant.firstCharacterId}`
            : `/league/games/${createdGame.id}`,
        })),
      ...signupAlertRecipients.map((recipient) => ({
        userId: recipient.id,
        createdByUserId: user.id,
        type: "GAME_CREATED" as const,
        title: `New game open for signup: ${parsed.data.title}`,
        body: `${user.name} posted ${parsed.data.title}, and it is open for signups now.`,
        details: [
          { label: "Adventure", value: parsed.data.adventureCode },
          { label: "Date", value: formattedDate },
          { label: "Tier", value: formatTier(parsed.data.tier) },
          {
            label: "Open spots",
            value: `${availableSpots} of ${parsed.data.seatCapacity}`,
          },
        ],
        actionLabel: "View game",
        actionHref: `/league/games/${createdGame.id}`,
      })),
    ]);

    return {
      createdGame,
      signupAlertRecipients,
      availableSpots,
    };
  });

  if (game.signupAlertRecipients.length) {
    const seatsOpenLabel = `${game.availableSpots} of ${parsed.data.seatCapacity}`;

    await Promise.allSettled(
      game.signupAlertRecipients.map((recipient) =>
        sendNewGameSignupAlertEmail({
          adventureCode: parsed.data.adventureCode,
          dmName: user.name,
          gameDateTime: formattedDateTime,
          gamePath: `/league/games/${game.createdGame.id}`,
          gameTitle: parsed.data.title,
          playerName: recipient.name,
          priceLabel: parsed.data.ticketPrice,
          seatsOpenLabel,
          tierLabel: formatTier(parsed.data.tier),
          to: recipient.email,
        }).catch((error) => {
          console.error(
            `Failed to send new game signup alert email to ${recipient.email}.`,
            error,
          );
        })
      )
    );
  }

  await syncPendingAdventureModuleFromPlayerLog({
    adventureCode: parsed.data.adventureCode,
    title: parsed.data.title,
    tier: parsed.data.tier,
    source: parsed.data.source,
    dmName: user.name,
    datePlayed: parsed.data.datePlayed,
    rewardsSummary: parsed.data.rewardsSummary,
    magicItemsAwarded: parsed.data.magicItemsAwarded,
    consumablesAwarded: parsed.data.consumablesAwarded,
    spellbookAwarded: parsed.data.spellbookAwarded,
    sessionNotes: parsed.data.sessionNotes,
    reportedByUserId: user.id,
  });

  await rebuildTidingAwards();

  redirect(`/dm/games/${game.createdGame.id}`);
}

export async function updateGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/dm");
  }

  const { currentUser, game } = await requireOwnedGame(gameId);
  const parsed = await parseGameForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const ticketAccessCodeHash = await resolveTicketAccessCodeHash({
    clearRequested: String(formData.get("clearTicketAccessCode") ?? "").trim() === "true",
    existingHash: game.ticketAccessCodeHash,
    ticketAccessCode: parsed.data.ticketAccessCode,
    ticketPrice: parsed.data.ticketPrice,
  });

  const adventureImageFile = formData.get("adventureImage");
  let adventureImagePath = game.adventureImagePath;

  if (adventureImageFile instanceof File && adventureImageFile.size > 0) {
    const uploadResult = await saveAdventureImage(adventureImageFile);

    if ("error" in uploadResult) {
      return {
        error: uploadResult.error,
        fieldErrors: {
          adventureImage: uploadResult.error,
        },
      };
    }

    adventureImagePath = uploadResult.path;
  }

  const participantLogData = getParticipantLogData(parsed.data);
  const previousParticipants = await prisma.gameParticipant.findMany({
    where: {
      gameId: game.id,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      character: {
        select: {
          name: true,
        },
      },
    },
  });
  const currentParticipantSummaries = buildParticipantSummaries(
    parsed.data.participants,
    parsed.playerMap
  );
  const previousParticipantSummaries = buildExistingParticipantSummaries(previousParticipants);
  const currentParticipantUserIds = new Set(
    currentParticipantSummaries.map((participant) => participant.userId)
  );
  const removedParticipantSummaries = previousParticipantSummaries.filter(
    (participant) => !currentParticipantUserIds.has(participant.userId)
  );
  const removedParticipantUserIds = Array.from(
    new Set(removedParticipantSummaries.map((participant) => participant.userId))
  );
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  if (
    parsed.data.isGrimTidings &&
    previousParticipants.length > 0 &&
    (!game.isGrimTidings || game.grimTidingCost !== parsed.data.grimTidingCost)
  ) {
    return {
      error:
        "Remove current participants before converting this game to Grim Tidings or changing its Tiding cost.",
      fieldErrors: {
        grimTidingCost: "Clear existing signups before changing the Tiding cost.",
        isGrimTidings: "Clear existing signups before converting this game to Grim Tidings.",
      },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: {
        id: game.id,
      },
      data: {
        title: parsed.data.title,
        adventureCode: parsed.data.adventureCode,
        source: parsed.data.source,
        gameSummary: parsed.data.gameSummary,
        ticketPrice: parsed.data.ticketPrice,
        isGrimTidings: parsed.data.isGrimTidings,
        grimTidingCost: parsed.data.grimTidingCost,
        ticketAccessCodeHash,
        adventureImagePath,
        datePlayed: new Date(parsed.data.datePlayed),
        duration: parsed.data.duration,
        tier: parsed.data.tier,
        seatCapacity: parsed.data.seatCapacity,
        serviceHours: parsed.data.serviceHours,
        downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        rewardsSummary: parsed.data.rewardsSummary,
        magicItemsAwarded: parsed.data.magicItemsAwarded,
        consumablesAwarded: parsed.data.consumablesAwarded,
        spellbookAwarded: parsed.data.spellbookAwarded,
        sessionNotes: parsed.data.sessionNotes,
        status: parsed.data.status,
      },
    });

    await tx.gameParticipant.deleteMany({
      where: {
        gameId: game.id,
      },
    });

    if (parsed.data.participants.length) {
      await tx.gameParticipant.createMany({
        data: parsed.data.participants.map((participant) => ({
          gameId: game.id,
          characterId: participant.characterId,
          userId: participant.userId,
          ...participantLogData,
        })),
      });
    }

    if (!parsed.data.isGrimTidings) {
      await tx.tidingSpend.updateMany({
        where: {
          gameId: game.id,
          refundedAt: null,
        },
        data: {
          refundedAt: new Date(),
        },
      });
    } else if (removedParticipantUserIds.length) {
      await tx.tidingSpend.updateMany({
        where: {
          gameId: game.id,
          refundedAt: null,
          userId: {
            in: removedParticipantUserIds,
          },
        },
        data: {
          refundedAt: new Date(),
        },
      });
    }

    await createNotifications(tx, [
      {
        userId: currentUser.id,
        createdByUserId: currentUser.id,
        type: "GAME_UPDATED",
        title: `Game updated: ${parsed.data.title}`,
        body: `You updated ${parsed.data.title}.`,
        details: [
          { label: "Adventure", value: parsed.data.adventureCode },
          { label: "Date", value: formattedDate },
          { label: "Status", value: parsed.data.status },
          { label: "Players", value: String(currentParticipantSummaries.length) },
        ],
        actionLabel: "View game",
        actionHref: `/dm/games/${game.id}`,
      },
      ...currentParticipantSummaries
        .filter((participant) => participant.userId !== currentUser.id)
        .map((participant) => ({
          userId: participant.userId,
          createdByUserId: currentUser.id,
          type: "GAME_UPDATED" as const,
          title: `Game updated: ${parsed.data.title}`,
          body: `${currentUser.name} updated a game involving ${participant.characterNames.join(", ")}.`,
          details: [
            { label: "Adventure", value: parsed.data.adventureCode },
            { label: "Date", value: formattedDate },
            { label: "Characters", value: participant.characterNames.join(", ") },
            { label: "Status", value: parsed.data.status },
          ],
          actionLabel: participant.firstCharacterId ? "Open character" : "View game",
          actionHref: participant.firstCharacterId
            ? `/player/characters/${participant.firstCharacterId}`
            : `/league/games/${game.id}`,
        })),
      ...removedParticipantSummaries
        .filter((participant) => participant.userId !== currentUser.id)
        .map((participant) => ({
          userId: participant.userId,
          createdByUserId: currentUser.id,
          type: "GAME_UPDATED" as const,
          title: `Removed from game: ${parsed.data.title}`,
          body: `${currentUser.name} removed ${participant.characterNames.join(", ")} from ${parsed.data.title}.`,
          details: [
            { label: "Adventure", value: parsed.data.adventureCode },
            { label: "Date", value: formattedDate },
            { label: "Characters", value: participant.characterNames.join(", ") },
          ],
          actionLabel: participant.firstCharacterId ? "View character log" : "View game",
          actionHref: participant.firstCharacterId
            ? `/player/characters/${participant.firstCharacterId}`
            : `/league/games/${game.id}`,
        })),
    ]);
  });

  await rebuildTidingAwards();

  await syncPendingAdventureModuleFromPlayerLog({
    adventureCode: parsed.data.adventureCode,
    title: parsed.data.title,
    tier: parsed.data.tier,
    source: parsed.data.source,
    dmName: currentUser.name,
    datePlayed: parsed.data.datePlayed,
    rewardsSummary: parsed.data.rewardsSummary,
    magicItemsAwarded: parsed.data.magicItemsAwarded,
    consumablesAwarded: parsed.data.consumablesAwarded,
    spellbookAwarded: parsed.data.spellbookAwarded,
    sessionNotes: parsed.data.sessionNotes,
    reportedByUserId: currentUser.id,
  });

  redirect(`/dm/games/${game.id}`);
}

export async function deleteGame(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");

  if (!gameId) {
    redirect("/dm");
  }

  const { currentUser, game } = await requireOwnedGame(gameId);
  const existingParticipants = await prisma.gameParticipant.findMany({
    where: {
      gameId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      character: {
        select: {
          name: true,
        },
      },
      game: {
        select: {
          title: true,
          adventureCode: true,
          datePlayed: true,
        },
      },
    },
  });
  const participantSummaries = buildExistingParticipantSummaries(existingParticipants);
  const deletedGame = existingParticipants[0]?.game;
  const formattedDate = deletedGame
    ? formatNotificationDate(deletedGame.datePlayed.toISOString())
    : "";

  await prisma.$transaction([
    prisma.tidingSpend.updateMany({
      where: {
        gameId,
        refundedAt: null,
      },
      data: {
        refundedAt: new Date(),
      },
    }),
    prisma.notification.createMany({
      data: [
        {
          userId: currentUser.id,
          createdByUserId: currentUser.id,
          type: "GAME_DELETED",
          title: deletedGame?.title
            ? `Game deleted: ${deletedGame.title}`
            : "Game deleted",
          body: deletedGame?.title
            ? `You deleted ${deletedGame.title}.`
            : "You deleted one of your games.",
          detailsJson: JSON.stringify(
            [
              deletedGame?.adventureCode
                ? { label: "Adventure", value: deletedGame.adventureCode }
                : null,
              formattedDate ? { label: "Date", value: formattedDate } : null,
            ].filter(Boolean)
          ),
          actionLabel: null,
          actionHref: null,
          isRead: false,
        },
        ...participantSummaries
          .filter((participant) => participant.userId !== currentUser.id)
          .map((participant) => ({
            userId: participant.userId,
            createdByUserId: currentUser.id,
            type: "GAME_DELETED" as const,
            title: deletedGame?.title
              ? `Game removed: ${deletedGame.title}`
              : "Game removed",
            body: deletedGame?.title
              ? `A game involving ${participant.characterNames.join(", ")} was removed.`
              : `${participant.characterNames.join(", ")} were removed from a game.`,
            detailsJson: JSON.stringify(
              [
                deletedGame?.adventureCode
                  ? { label: "Adventure", value: deletedGame.adventureCode }
                  : null,
                formattedDate ? { label: "Date", value: formattedDate } : null,
                { label: "Characters", value: participant.characterNames.join(", ") },
              ].filter(Boolean)
            ),
            actionLabel: participant.firstCharacterId ? "Open character" : "View game",
            actionHref: participant.firstCharacterId
              ? `/player/characters/${participant.firstCharacterId}`
              : "/league",
            isRead: false,
          })),
      ],
    }),
    prisma.gameParticipant.deleteMany({
      where: {
        gameId,
      },
    }),
    prisma.game.delete({
      where: {
        id: gameId,
      },
    }),
  ]);

  await rebuildTidingAwards();

  redirect("/dm");
}
