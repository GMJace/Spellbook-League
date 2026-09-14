import type { PrismaClient } from "@prisma/client";
import { importCharacterFromDndBeyondLink, isDndBeyondLink, type DndBeyondCharacterImport } from "@/lib/dnd-beyond-character-import";

export const DND_BEYOND_REFRESH_INTERVAL_MS = 30_000;

export function characterSyncFields(imported: DndBeyondCharacterImport) {
  // Explicit allowlist: currency, league slots, awards, trades and notes stay local.
  return {
    name: imported.name,
    class1Name: imported.class1Name, class1Level: imported.class1Level, class1Subclass: imported.class1Subclass,
    class2Name: imported.class2Name, class2Level: imported.class2Level, class2Subclass: imported.class2Subclass,
    class3Name: imported.class3Name, class3Level: imported.class3Level, class3Subclass: imported.class3Subclass,
    feats: imported.feats, proficiencies: imported.proficiencies, languages: imported.languages, tools: imported.tools,
    hitPoints: imported.hitPoints, armorClass: imported.armorClass,
    passivePerception: imported.passivePerception, spellSaveDc: imported.spellSaveDc,
  };
}

export async function syncDndBeyondCharacter(
  db: PrismaClient, characterId: string,
  importer: typeof importCharacterFromDndBeyondLink = importCharacterFromDndBeyondLink,
) {
  const character = await db.character.findUnique({ where: { id: characterId } });
  if (!character || !isDndBeyondLink(character.characterSheetLink)) return { status: "unlinked" as const };
  const link = character.characterSheetLink!;
  const attemptAt = new Date();
  const cutoff = new Date(attemptAt.getTime() - DND_BEYOND_REFRESH_INTERVAL_MS);
  // Database claim coalesces requests across tabs and server processes. Never hold a transaction during a network fetch.
  const claim = await db.character.updateMany({
    where: {
      id: characterId, characterSheetLink: link, updatedAt: character.updatedAt,
      OR: [{ dndBeyondAttemptAt: null }, { dndBeyondAttemptAt: { lt: cutoff } }, { dndBeyondSyncLink: { not: link } }, { dndBeyondSyncLink: null }],
    },
    data: {
      dndBeyondAttemptAt: attemptAt, dndBeyondSyncLink: link, updatedAt: character.updatedAt,
      ...(character.dndBeyondSyncLink !== link ? { dndBeyondData: null, dndBeyondSyncedAt: null, dndBeyondError: null } : {}),
    },
  });
  if (!claim.count) return { status: "recent" as const };
  const where = { id: characterId, characterSheetLink: link, dndBeyondAttemptAt: attemptAt, updatedAt: character.updatedAt };
  try {
    const imported = await importer(link);
    const saved = await db.character.updateMany({
      where,
      data: { ...characterSyncFields(imported), dndBeyondData: JSON.stringify(imported), dndBeyondSyncedAt: new Date(), dndBeyondError: null },
    });
    // An edit or link change during the fetch wins. A later visit can retry.
    return { status: saved.count ? "synced" as const : "changed" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Character refresh failed. Saved information was kept.";
    await db.character.updateMany({ where, data: { dndBeyondError: message.slice(0, 500), updatedAt: character.updatedAt } });
    return { status: "error" as const, error: message };
  }
}
