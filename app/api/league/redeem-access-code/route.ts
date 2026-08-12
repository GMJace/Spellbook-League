import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { getCharacterTier, getCharacterTotalLevel } from "@/lib/character";
import { normalizeParticipantCharacterId } from "@/lib/game-participants";
import { prisma } from "@/lib/prisma";
import { isPaidTicketPrice } from "@/lib/utils";

const redeemAccessCodeSchema = z.object({
  accessCode: z.string().trim().min(1).max(100),
  characterId: z.string().trim().min(1),
  gameId: z.string().trim().min(1),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid access-code payload.", 400);
  }

  const parsed = redeemAccessCodeSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid access-code payload.", 400);
  }

  const session = await auth();

  if (!session?.user?.id) {
    return jsonError("Sign in with a player account before redeeming an access code.", 401);
  }

  const player = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      roles: true,
      characters: {
        select: {
          id: true,
          name: true,
          class1Level: true,
          class2Level: true,
          class3Level: true,
        },
      },
    },
  });

  if (!player || !player.roles.some((role) => role.role === "PLAYER")) {
    return jsonError("A player account is required before redeeming an access code.", 403);
  }

  const selectedCharacterId = normalizeParticipantCharacterId(parsed.data.characterId);

  if (
    selectedCharacterId &&
    !player.characters.some((character) => character.id === selectedCharacterId)
  ) {
    return jsonError("Choose one of your characters or select TBD before redeeming a code.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: {
        id: parsed.data.gameId,
      },
      include: {
        participants: {
          select: {
            id: true,
            userId: true,
            characterId: true,
          },
        },
      },
    });

    if (!game) {
      return { error: "That game could not be found.", status: 404 } as const;
    }

    if (game.status !== "SCHEDULED" || game.datePlayed < new Date()) {
      return { error: "This game is no longer open for online signup.", status: 400 } as const;
    }

    if (!isPaidTicketPrice(game.ticketPrice)) {
      return { error: "This game does not require an access code.", status: 400 } as const;
    }

    if (!game.ticketAccessCodeHash) {
      return { error: "This game does not currently have an access code.", status: 400 } as const;
    }

    const codeMatches = await bcrypt.compare(
      parsed.data.accessCode.trim(),
      game.ticketAccessCodeHash,
    );

    if (!codeMatches) {
      return { error: "That access code is not valid for this game.", status: 400 } as const;
    }

    if (game.participants.some((participant) => participant.userId === player.id)) {
      return { error: "You are already signed up for this game.", status: 400 } as const;
    }

    if (
      selectedCharacterId &&
      game.participants.some((participant) => participant.characterId === selectedCharacterId)
    ) {
      return { error: "That character is already assigned to this game.", status: 400 } as const;
    }

    const selectedCharacter = selectedCharacterId
      ? player.characters.find((character) => character.id === selectedCharacterId) ?? null
      : null;

    if (
      selectedCharacter &&
      getCharacterTier(getCharacterTotalLevel(selectedCharacter)) !==
        Number(game.tier.replace("TIER_", ""))
    ) {
      return { error: "Choose a character whose tier matches this game.", status: 400 } as const;
    }

    const availableSpots = Math.max((game.seatCapacity ?? 0) - game.participants.length, 0);

    if (availableSpots <= 0) {
      return { error: "This game is currently full.", status: 400 } as const;
    }

    await tx.gameParticipant.create({
      data: {
        approvedAt: null,
        characterId: selectedCharacterId,
        gameId: game.id,
        logConsumablesAwarded: null,
        logMagicItemsAwarded: null,
        logRewardsSummary: null,
        logSessionNotes: null,
        logStatus: "APPROVED",
        userId: player.id,
      },
    });

    return { status: 200 } as const;
  });

  if ("error" in result && result.error) {
    return jsonError(result.error, result.status ?? 400);
  }

  revalidatePath("/");
  revalidatePath("/league");
  revalidatePath("/league/cart");
  revalidatePath(`/league/games/${parsed.data.gameId}`);
  revalidatePath("/player");

  if (selectedCharacterId) {
    revalidatePath(`/player/characters/${selectedCharacterId}`);
  }

  return NextResponse.json({ success: true });
}
