"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const characterDowntimeSchema = z.object({
  activity: z.string().trim().min(2).max(80),
  downtimeDaysSpent: z.coerce.number().int().min(1).max(999),
  relatedAdventureCode: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(1500).default(""),
  spentAt: z.string().min(1),
});

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

function revalidateDowntimePages(characterId: string) {
  revalidatePath("/player");
  revalidatePath(`/player/characters/${characterId}`);
  revalidatePath(`/player/characters/${characterId}/downtime/new`);
}

async function requireOwnedDowntimeEntry(characterId: string, entryId: string) {
  const { user, character } = await requireOwnedCharacter(characterId);

  const entry = await prisma.characterDowntimeEntry.findFirst({
    where: {
      id: entryId,
      characterId,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!entry) {
    redirect(`/player/characters/${characterId}`);
  }

  return { user, character, entry };
}

export async function createCharacterDowntimeEntry(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");

  if (!characterId) {
    redirect("/player");
  }

  const { user, character } = await requireOwnedCharacter(characterId);

  const parsed = characterDowntimeSchema.safeParse({
    activity: formData.get("activity"),
    downtimeDaysSpent: formData.get("downtimeDaysSpent"),
    relatedAdventureCode: formData.get("relatedAdventureCode"),
    notes: formData.get("notes"),
    spentAt: formData.get("spentAt"),
  });

  if (!parsed.success || Number.isNaN(new Date(parsed.data.spentAt).getTime())) {
    redirect(`/player/characters/${characterId}/downtime/new?error=invalid`);
  }

  await prisma.characterDowntimeEntry.create({
    data: {
      userId: user.id,
      characterId: character.id,
      activity: parsed.data.activity,
      downtimeDaysSpent: parsed.data.downtimeDaysSpent,
      relatedAdventureCode: parsed.data.relatedAdventureCode,
      notes: parsed.data.notes,
      spentAt: new Date(parsed.data.spentAt),
    },
  });

  revalidateDowntimePages(character.id);

  redirect(`/player/characters/${character.id}?downtime=logged`);
}

export async function updateCharacterDowntimeEntry(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");

  if (!characterId || !entryId) {
    redirect("/player");
  }

  const { character, entry } = await requireOwnedDowntimeEntry(characterId, entryId);

  const parsed = characterDowntimeSchema.safeParse({
    activity: formData.get("activity"),
    downtimeDaysSpent: formData.get("downtimeDaysSpent"),
    relatedAdventureCode: formData.get("relatedAdventureCode"),
    notes: formData.get("notes"),
    spentAt: formData.get("spentAt"),
  });

  if (!parsed.success || Number.isNaN(new Date(parsed.data.spentAt).getTime())) {
    redirect(`/player/characters/${characterId}/downtime/${entryId}/edit?error=invalid`);
  }

  await prisma.characterDowntimeEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      activity: parsed.data.activity,
      downtimeDaysSpent: parsed.data.downtimeDaysSpent,
      relatedAdventureCode: parsed.data.relatedAdventureCode,
      notes: parsed.data.notes,
      spentAt: new Date(parsed.data.spentAt),
    },
  });

  revalidateDowntimePages(character.id);
  revalidatePath(`/player/characters/${character.id}/downtime/${entry.id}/edit`);

  redirect(`/player/characters/${character.id}?downtime=updated`);
}

export async function deleteCharacterDowntimeEntry(characterId: string, entryId: string) {
  if (!characterId || !entryId) {
    redirect("/player");
  }

  const { character, entry } = await requireOwnedDowntimeEntry(characterId, entryId);

  await prisma.characterDowntimeEntry.delete({
    where: {
      id: entry.id,
    },
  });

  revalidateDowntimePages(character.id);
  revalidatePath(`/player/characters/${character.id}/downtime/${entry.id}/edit`);

  redirect(`/player/characters/${character.id}?downtime=deleted`);
}
