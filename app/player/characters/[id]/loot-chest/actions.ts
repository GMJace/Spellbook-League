"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeChestCode(value: FormDataEntryValue | null) {
  const compact = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^CHEST/, "");

  if (!compact) {
    return "";
  }

  return `CHEST-${compact.match(/.{1,4}/g)?.join("-") ?? compact}`;
}

function buildLootChestHref(characterId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/player/characters/${characterId}/loot-chest?${searchParams.toString()}`;
}

export async function redeemChestCode(characterId: string, formData: FormData) {
  const user = await requireRole("PLAYER");
  const code = normalizeChestCode(formData.get("code"));

  if (!code) {
    redirect(buildLootChestHref(characterId, { error: "missing-code" }));
  }

  const participant = await prisma.gameParticipant.findFirst({
    where: {
      chestCode: code,
      characterId,
      userId: user.id,
      logStatus: "APPROVED",
      game: {
        status: "COMPLETED",
      },
    },
    select: {
      id: true,
      chestCodeRedeemedAt: true,
    },
  });

  if (!participant) {
    redirect(buildLootChestHref(characterId, { error: "invalid-code", code }));
  }

  if (participant.chestCodeRedeemedAt) {
    redirect(buildLootChestHref(characterId, { error: "already-redeemed", code }));
  }

  await prisma.gameParticipant.update({
    where: { id: participant.id },
    data: {
      chestCodeRedeemedAt: new Date(),
    },
  });

  revalidatePath(`/player/characters/${characterId}`);
  revalidatePath(`/player/characters/${characterId}/loot-chest`);

  redirect(buildLootChestHref(characterId, { redeemed: "1", code }));
}
