"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getParticipantCharacterLabel } from "@/lib/game-participants";
import {
  buildStoredGameRewardStrings,
  hasStructuredGameRewardSelectionFields,
  readGameRewardSelectionsFromFormData,
} from "@/lib/game-reward-selections";
import { createNotification } from "@/lib/notifications";
import {
  buildImportedRewardStrings,
  getImportedCellValue,
  getMissingPlayerLogsheetFields,
  isMeaningfulPlayerLogsheetRow,
  normalizeImportedTier,
  normalizePlayerLogsheetHeader,
  PLAYER_LOGSHEET_IMPORT_HEADER_ALIASES,
  type PlayerLogsheetImportField,
} from "@/lib/player-logsheet-import";
import { syncPendingAdventureModuleFromPlayerLog } from "@/lib/pending-adventure-modules";
import { prisma } from "@/lib/prisma";
import { parseUploadedTabularFile } from "@/lib/tabular-import";
import { rebuildTidingAwards } from "@/lib/tidings";
import { z } from "zod";

const MAX_LOGSHEET_IMPORT_SIZE = 2 * 1024 * 1024;

const playerGameLogSchema = z.object({
  title: z.string().trim().min(2).max(120),
  adventureCode: z.string().trim().min(2).max(40),
  source: z.string().trim().max(2000).default(""),
  datePlayed: z.string().min(1),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3", "TIER_4"]),
  dmName: z.string().trim().min(2).max(80),
  downtimeDaysAwarded: z.coerce.number().int().min(0).max(999),
  rewardsSummary: z.string().trim(),
  magicItemsAwarded: z.string().trim().max(1500).default(""),
  consumablesAwarded: z.string().trim().max(500).default(""),
  spellbookAwarded: z.string().trim().max(1500).default(""),
  sessionNotes: z.string().trim(),
  status: z.literal("COMPLETED"),
});

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

async function requireOwnedCharacter(characterId: string) {
  const user = await requireRole("PLAYER");

  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      userId: true,
    },
  });

  if (!character) {
    redirect("/player");
  }

  return { user, character };
}

async function requireOwnedLoggedGame(characterId: string, gameId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const participant = await prisma.gameParticipant.findFirst({
    where: {
      characterId,
      userId: user.id,
      gameId,
      logStatus: "APPROVED",
      game: {
        status: "COMPLETED",
      },
    },
    include: {
      game: true,
      character: true,
    },
  });

  if (!participant) {
    redirect(`/player/characters/${characterId}`);
  }

  return { user, character, participant };
}

function getApprovedParticipantUpdate(status: "SCHEDULED" | "COMPLETED" | "CANCELLED") {
  return {
    logStatus: "APPROVED" as const,
    approvedAt: status === "COMPLETED" ? new Date() : null,
    logDowntimeDaysAwarded: null,
    logRewardsSummary: null,
    logMagicItemsAwarded: null,
    logConsumablesAwarded: null,
    logSpellbookAwarded: null,
    logSessionNotes: null,
  };
}

function getSubmittedRewardStrings(formData: FormData) {
  if (!hasStructuredGameRewardSelectionFields(formData)) {
    return {
      magicItemsAwarded: String(formData.get("magicItemsAwarded") ?? ""),
      consumablesAwarded: String(formData.get("consumablesAwarded") ?? ""),
    };
  }

  return buildStoredGameRewardStrings(readGameRewardSelectionsFromFormData(formData));
}

type PlayerGameLogInput = z.infer<typeof playerGameLogSchema>;

function normalizeImportDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const numericValue = Number(trimmed);

    if (Number.isFinite(numericValue)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const milliseconds = Math.round(numericValue * 24 * 60 * 60 * 1000);
      return new Date(excelEpoch.getTime() + milliseconds).toISOString();
    }
  }

  return trimmed;
}

function isValidImportedDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function buildImportErrorHref(characterId: string, code: string, details = "") {
  const searchParams = new URLSearchParams({ error: code });

  if (details.trim()) {
    searchParams.set("details", details.trim());
  }

  return `/player/characters/${characterId}/games/import?${searchParams.toString()}`;
}

function buildImportedRowRecord(
  normalizedHeaders: string[],
  row: string[],
) {
  const result = {} as Record<PlayerLogsheetImportField, string>;

  for (const [field, aliases] of Object.entries(
    PLAYER_LOGSHEET_IMPORT_HEADER_ALIASES,
  ) as Array<[PlayerLogsheetImportField, string[]]>) {
    result[field] = getImportedCellValue(normalizedHeaders, row, aliases);
  }

  return result;
}

async function createApprovedPlayerManagedGameLog({
  character,
  data,
  tx,
  user,
}: {
  character: { id: string; name: string };
  data: PlayerGameLogInput;
  tx: Prisma.TransactionClient;
  user: { id: string; name: string };
}) {
  const participantDefaults = getApprovedParticipantUpdate(data.status);

  const createdGame = await tx.game.create({
    data: {
      dmId: null,
      loggedByUserId: user.id,
      dmName: data.dmName,
      title: data.title,
      adventureCode: data.adventureCode,
      source: data.source,
      adventureImagePath: null,
      datePlayed: new Date(data.datePlayed),
      tier: data.tier,
      serviceHours: 0,
      downtimeDaysAwarded: data.downtimeDaysAwarded,
      rewardsSummary: data.rewardsSummary,
      magicItemsAwarded: data.magicItemsAwarded,
      consumablesAwarded: data.consumablesAwarded,
      spellbookAwarded: data.spellbookAwarded,
      consequencesSummary: "",
      sessionNotes: data.sessionNotes,
      status: data.status,
    },
  });

  await tx.gameParticipant.create({
    data: {
      gameId: createdGame.id,
      characterId: character.id,
      userId: user.id,
      ...participantDefaults,
      logDowntimeDaysAwarded: data.downtimeDaysAwarded,
    },
  });

  return createdGame;
}

export async function createPlayerGameLog(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);
  const rewardStrings = getSubmittedRewardStrings(formData);

  const parsed = playerGameLogSchema.safeParse({
    title: formData.get("title"),
    adventureCode: formData.get("adventureCode"),
    source: formData.get("source"),
    datePlayed: formData.get("datePlayed"),
    tier: formData.get("tier"),
    dmName: formData.get("dmName"),
    downtimeDaysAwarded: formData.get("downtimeDaysAwarded"),
    rewardsSummary: formData.get("rewardsSummary"),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    spellbookAwarded: formData.get("spellbookAwarded"),
    sessionNotes: formData.get("sessionNotes"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(`/player/characters/${characterId}/games/new?error=invalid`);
  }

  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  const game = await prisma.$transaction(async (tx) => {
    const createdGame = await createApprovedPlayerManagedGameLog({
      character,
      data: parsed.data,
      tx,
      user,
    });

    await createNotification(tx, {
      userId: user.id,
      createdByUserId: user.id,
      type: "GAME_LOGGED",
      title: `Game log recorded: ${parsed.data.title}`,
      body: `You logged ${parsed.data.title} for ${character.name}.`,
      details: [
        { label: "Adventure", value: parsed.data.adventureCode },
        { label: "Date", value: formattedDate },
        { label: "Character", value: character.name },
        { label: "DM", value: parsed.data.dmName },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${character.id}`,
    });

    return createdGame;
  });

  await rebuildTidingAwards();

  await syncPendingAdventureModuleFromPlayerLog({
    adventureCode: parsed.data.adventureCode,
    title: parsed.data.title,
    tier: parsed.data.tier,
    source: parsed.data.source,
    dmName: parsed.data.dmName,
    datePlayed: parsed.data.datePlayed,
    rewardsSummary: parsed.data.rewardsSummary,
    magicItemsAwarded: parsed.data.magicItemsAwarded,
    consumablesAwarded: parsed.data.consumablesAwarded,
    spellbookAwarded: parsed.data.spellbookAwarded,
    sessionNotes: parsed.data.sessionNotes,
    reportedByUserId: user.id,
  });

  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);
  revalidatePath("/admin/modules");

  redirect(`/player/characters/${characterId}?logged=1`);
}

export async function importPlayerGameLogsheet(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);
  const file = formData.get("logsheetFile");

  if (!(file instanceof File) || file.size <= 0) {
    redirect(buildImportErrorHref(character.id, "missing-file"));
  }

  if (file.size > MAX_LOGSHEET_IMPORT_SIZE) {
    redirect(buildImportErrorHref(character.id, "file-too-large"));
  }

  const filename = file.name.toLowerCase();

  if (!filename.endsWith(".csv") && !filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
    redirect(buildImportErrorHref(character.id, "invalid-file"));
  }

  const rows = await parseUploadedTabularFile(file);

  if (!rows.length) {
    redirect(buildImportErrorHref(character.id, "empty-file"));
  }

  const headerRow = rows[0].map((value) => normalizePlayerLogsheetHeader(value));
  const missingHeaders = getMissingPlayerLogsheetFields(headerRow);

  if (missingHeaders.length) {
    redirect(
      buildImportErrorHref(
        character.id,
        "invalid-headers",
        `Missing columns: ${missingHeaders.join(", ")}`,
      ),
    );
  }

  const parsedRows: PlayerGameLogInput[] = [];
  const rowErrors: string[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];

    if (!isMeaningfulPlayerLogsheetRow(headerRow, row)) {
      continue;
    }

    const record = buildImportedRowRecord(headerRow, row);
    const importedRewardStrings = buildImportedRewardStrings(headerRow, row);
    const normalizedDate = normalizeImportDate(record.datePlayed);
    const normalizedTier = normalizeImportedTier(record.tier);

    if (!normalizedDate || !isValidImportedDate(normalizedDate)) {
      rowErrors.push(`Row ${index + 1}: Date Played is not a valid date.`);
      continue;
    }

    if (!normalizedTier) {
      rowErrors.push(`Row ${index + 1}: Tier must be Tier 1-4 or TIER_1-TIER_4.`);
      continue;
    }

    const parsed = playerGameLogSchema.safeParse({
      title: record.title,
      adventureCode: record.adventureCode,
      source: record.source,
      datePlayed: normalizedDate,
      tier: normalizedTier,
      dmName: record.dmName,
      downtimeDaysAwarded: 10,
      rewardsSummary: record.rewardsSummary,
      magicItemsAwarded: importedRewardStrings.magicItemsAwarded || record.magicItemsAwarded,
      consumablesAwarded: importedRewardStrings.consumablesAwarded || record.consumablesAwarded,
      spellbookAwarded: importedRewardStrings.spellbookAwarded || record.spellbookAwarded,
      sessionNotes: importedRewardStrings.sessionNotes || record.sessionNotes,
      status: "COMPLETED",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.[0];
      rowErrors.push(
        `Row ${index + 1}: ${typeof path === "string" ? path : "game details"} could not be imported.`,
      );
      continue;
    }

    parsedRows.push(parsed.data);
  }

  if (!parsedRows.length && !rowErrors.length) {
    redirect(buildImportErrorHref(character.id, "no-rows"));
  }

  if (rowErrors.length) {
    redirect(
      buildImportErrorHref(
        character.id,
        "invalid-rows",
        rowErrors.slice(0, 5).join(" "),
      ),
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const row of parsedRows) {
      await createApprovedPlayerManagedGameLog({
        character,
        data: row,
        tx,
        user,
      });
    }

    await createNotification(tx, {
      userId: user.id,
      createdByUserId: user.id,
      type: "GAME_LOGGED",
      title: `Imported ${parsedRows.length} game log entr${parsedRows.length === 1 ? "y" : "ies"}`,
      body: `You imported ${parsedRows.length} completed game log entr${parsedRows.length === 1 ? "y" : "ies"} for ${character.name}.`,
      details: [
        { label: "Character", value: character.name },
        { label: "Imported rows", value: String(parsedRows.length) },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${character.id}`,
    });
  });

  await rebuildTidingAwards();

  for (const row of parsedRows) {
    await syncPendingAdventureModuleFromPlayerLog({
      adventureCode: row.adventureCode,
      title: row.title,
      tier: row.tier,
      source: row.source,
      dmName: row.dmName,
      datePlayed: row.datePlayed,
      rewardsSummary: row.rewardsSummary,
      magicItemsAwarded: row.magicItemsAwarded,
      consumablesAwarded: row.consumablesAwarded,
      spellbookAwarded: row.spellbookAwarded,
      sessionNotes: row.sessionNotes,
      reportedByUserId: user.id,
    });
  }

  revalidatePath("/player");
  revalidatePath(`/player/characters/${character.id}`);
  revalidatePath("/admin/modules");

  redirect(`/player/characters/${character.id}?imported=${parsedRows.length}`);
}

export async function updatePlayerGameLog(
  formData: FormData
) {
  const characterId = String(formData.get("characterId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");

  if (!characterId || !gameId) {
    redirect("/player");
  }

  const { character, participant } = await requireOwnedLoggedGame(characterId, gameId);
  const rewardStrings = getSubmittedRewardStrings(formData);

  const parsed = playerGameLogSchema.safeParse({
    title: formData.get("title"),
    adventureCode: formData.get("adventureCode"),
    source: formData.get("source"),
    datePlayed: formData.get("datePlayed"),
    tier: formData.get("tier"),
    dmName: formData.get("dmName"),
    downtimeDaysAwarded: formData.get("downtimeDaysAwarded"),
    rewardsSummary: formData.get("rewardsSummary"),
    magicItemsAwarded: rewardStrings.magicItemsAwarded,
    consumablesAwarded: rewardStrings.consumablesAwarded,
    spellbookAwarded: formData.get("spellbookAwarded"),
    sessionNotes: formData.get("sessionNotes"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    redirect(
      `/player/characters/${characterId}/games/${gameId}/edit?error=invalid`
    );
  }

  const isPlayerManagedLog = participant.game.loggedByUserId === participant.userId;
  const participantDefaults = getApprovedParticipantUpdate(parsed.data.status);
  const formattedDate = formatNotificationDate(parsed.data.datePlayed);

  await prisma.$transaction(async (tx) => {
    if (isPlayerManagedLog) {
      await tx.game.update({
        where: {
          id: participant.gameId,
        },
        data: {
          dmId: null,
          dmName: parsed.data.dmName,
          title: parsed.data.title,
          adventureCode: parsed.data.adventureCode,
          source: parsed.data.source,
          datePlayed: new Date(parsed.data.datePlayed),
          tier: parsed.data.tier,
          downtimeDaysAwarded: parsed.data.downtimeDaysAwarded,
          rewardsSummary: parsed.data.rewardsSummary,
          magicItemsAwarded: parsed.data.magicItemsAwarded,
          consumablesAwarded: parsed.data.consumablesAwarded,
          spellbookAwarded: parsed.data.spellbookAwarded,
          sessionNotes: parsed.data.sessionNotes,
          status: parsed.data.status,
        },
      });

      await tx.gameParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          ...participantDefaults,
          logDowntimeDaysAwarded: parsed.data.downtimeDaysAwarded,
        },
      });
    } else {
      await tx.gameParticipant.update({
        where: {
          id: participant.id,
        },
        data: {
          logStatus: "APPROVED",
          approvedAt: participant.approvedAt ?? new Date(),
          logDowntimeDaysAwarded: parsed.data.downtimeDaysAwarded,
          logRewardsSummary: parsed.data.rewardsSummary,
          logMagicItemsAwarded: parsed.data.magicItemsAwarded,
          logConsumablesAwarded: parsed.data.consumablesAwarded,
          logSpellbookAwarded: parsed.data.spellbookAwarded,
          logSessionNotes: parsed.data.sessionNotes,
        },
      });
    }

    await createNotification(tx, {
      userId: participant.userId,
      createdByUserId: participant.userId,
      type: "GAME_LOGGED",
      title: `Game log updated: ${parsed.data.title}`,
      body: `You updated the log for ${parsed.data.title}.`,
      details: [
        { label: "Adventure", value: parsed.data.adventureCode },
        { label: "Date", value: formattedDate },
        { label: "Character", value: getParticipantCharacterLabel(participant.character?.name ?? character.name) },
        { label: "DM", value: parsed.data.dmName },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${characterId}`,
    });
  });

  await rebuildTidingAwards();

  await syncPendingAdventureModuleFromPlayerLog({
    adventureCode: parsed.data.adventureCode,
    title: parsed.data.title,
    tier: parsed.data.tier,
    source: parsed.data.source,
    dmName: parsed.data.dmName,
    datePlayed: parsed.data.datePlayed,
    rewardsSummary: parsed.data.rewardsSummary,
    magicItemsAwarded: parsed.data.magicItemsAwarded,
    consumablesAwarded: parsed.data.consumablesAwarded,
    spellbookAwarded: parsed.data.spellbookAwarded,
    sessionNotes: parsed.data.sessionNotes,
    reportedByUserId: participant.userId,
  });

  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);
  revalidatePath(`/player/characters/${characterId}/games/${gameId}/edit`);
  revalidatePath(`/dm/games/${gameId}`);
  revalidatePath("/admin/modules");

  redirect(`/player/characters/${characterId}?updatedLog=1`);
}

export async function deletePlayerGameLog(characterId: string, gameId: string) {
  if (!characterId || !gameId) {
    redirect("/player");
  }

  const { user, character, participant } = await requireOwnedLoggedGame(characterId, gameId);
  const isPlayerManagedLog = participant.game.loggedByUserId === user.id;

  await prisma.$transaction(async (tx) => {
    await tx.gameParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    if (isPlayerManagedLog) {
      const remainingParticipants = await tx.gameParticipant.count({
        where: {
          gameId: participant.gameId,
        },
      });

      if (remainingParticipants === 0) {
        await tx.game.delete({
          where: {
            id: participant.gameId,
          },
        });
      }
    }

    await createNotification(tx, {
      userId: user.id,
      createdByUserId: user.id,
      type: "GAME_LOGGED",
      title: `Game log deleted: ${participant.game.title}`,
      body: `You removed the log for ${participant.game.title} from ${character.name}.`,
      details: [
        { label: "Adventure", value: participant.game.adventureCode },
        { label: "Character", value: character.name },
      ],
      actionLabel: "Open character",
      actionHref: `/player/characters/${character.id}`,
    });
  });

  await rebuildTidingAwards();

  revalidatePath("/player");
  revalidatePath(`/player/characters/${character.id}`);
  revalidatePath(`/player/characters/${character.id}/games/${gameId}`);
  revalidatePath(`/player/characters/${character.id}/games/${gameId}/edit`);

  if (!isPlayerManagedLog) {
    revalidatePath(`/dm/games/${gameId}`);
  }

  redirect(`/player/characters/${character.id}?deletedLog=1`);
}
