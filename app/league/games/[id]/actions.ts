"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPaidTicketPrice } from "@/lib/utils";

function redirectToSignupState(gameId: string, state: string) {
  redirect(`/league/games/${gameId}?signup=${encodeURIComponent(state)}`);
}

export async function signupForFreeLeagueGame(formData: FormData) {
  const user = await requireRole("PLAYER");
  const gameId = String(formData.get("gameId") ?? "").trim();
  const characterId = String(formData.get("characterId") ?? "").trim();

  if (!gameId) {
    redirect("/league");
  }

  if (!characterId) {
    redirectToSignupState(gameId, "choose-character");
  }

  const player = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      characters: {
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!player) {
    redirect("/login?session=stale");
  }

  if (!player.characters.some((character) => character.id === characterId)) {
    redirectToSignupState(gameId, "invalid-character");
  }

  const result = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: {
        id: gameId,
      },
      include: {
        participants: {
          select: {
            userId: true,
            characterId: true,
          },
        },
      },
    });

    if (!game) {
      return "missing";
    }

    if (game.status !== "SCHEDULED") {
      return "closed";
    }

    if (isPaidTicketPrice(game.ticketPrice)) {
      return "paid";
    }

    if (game.participants.some((participant) => participant.userId === user.id)) {
      return "already";
    }

    if (game.participants.some((participant) => participant.characterId === characterId)) {
      return "already";
    }

    const availableSpots = Math.max((game.seatCapacity ?? 0) - game.participants.length, 0);

    if (availableSpots <= 0) {
      return "full";
    }

    await tx.gameParticipant.create({
      data: {
        gameId: game.id,
        characterId,
        userId: user.id,
        logStatus: "APPROVED",
        approvedAt: null,
        logRewardsSummary: null,
        logMagicItemsAwarded: null,
        logConsumablesAwarded: null,
        logSessionNotes: null,
      },
    });

    return "success";
  });

  revalidatePath("/");
  revalidatePath("/league");
  revalidatePath(`/league/games/${gameId}`);
  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);

  if (result === "missing") {
    redirect("/league");
  }

  redirectToSignupState(gameId, result);
}
