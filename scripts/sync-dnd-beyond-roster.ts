import { isDndBeyondLink } from "../lib/dnd-beyond-character-import";
import { syncDndBeyondCharacter } from "../lib/dnd-beyond-character-sync";
import { prisma } from "../lib/prisma";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const RETRY_AFTER_MS = 60 * 60 * 1000;
const MAX_PER_RUN = 60;
const PAUSE_BETWEEN_REQUESTS_MS = 1_500;

async function main() {
  const now = Date.now();
  const characters = await prisma.character.findMany({
    where: { characterSheetLink: { not: null } },
    select: {
      id: true,
      characterSheetLink: true,
      dndBeyondSyncLink: true,
      dndBeyondData: true,
      dndBeyondSyncedAt: true,
      dndBeyondAttemptAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const due = characters.filter((character) => {
    if (!isDndBeyondLink(character.characterSheetLink)) return false;
    if (character.dndBeyondAttemptAt && now - character.dndBeyondAttemptAt.getTime() < RETRY_AFTER_MS) return false;
    return character.dndBeyondSyncLink !== character.characterSheetLink ||
      !character.dndBeyondData || !character.dndBeyondSyncedAt ||
      now - character.dndBeyondSyncedAt.getTime() >= STALE_AFTER_MS;
  }).slice(0, MAX_PER_RUN);

  const counts = { linked: characters.filter((character) => isDndBeyondLink(character.characterSheetLink)).length,
    due: due.length, synced: 0, recent: 0, changed: 0, error: 0 };
  for (const character of due) {
    const result = await syncDndBeyondCharacter(prisma, character.id);
    if (result.status in counts) counts[result.status as keyof typeof counts] += 1;
    if (result.status === "error" && result.error.includes("limiting requests")) break;
    await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_REQUESTS_MS));
  }
  console.log(`D&D Beyond roster sync: ${JSON.stringify(counts)}`);
}

main().catch((error) => {
  console.error("D&D Beyond roster sync failed:", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
