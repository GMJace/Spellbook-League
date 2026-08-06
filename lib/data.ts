import { prisma } from "@/lib/prisma";

export async function getHomepageData() {
  const handbooks = await prisma.handbook.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const grouped = await prisma.gameParticipant.groupBy({
    by: ["characterId"],
    _count: { gameId: true },
    orderBy: {
      _count: {
        gameId: "desc",
      },
    },
    take: 10,
  });

  const characters = await prisma.character.findMany({
    where: {
      id: { in: grouped.map((entry) => entry.characterId) },
    },
    include: {
      user: true,
    },
  });

  const characterMap = new Map(characters.map((character) => [character.id, character]));

  const leaderboard = grouped
    .map((entry) => {
      const character = characterMap.get(entry.characterId);
      if (!character) {
        return null;
      }

      return {
        id: character.id,
        name: character.name,
        ownerName: character.user.name,
        gamesPlayed: entry._count.gameId,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name))
    .slice(0, 10);

  const playerActivityCharacters = await prisma.character.findMany({
    include: {
      user: true,
      participants: true,
    },
    orderBy: { name: "asc" },
  });

  const playerRoster = playerActivityCharacters
    .map((character) => ({
      id: character.id,
      playerName: character.user.name,
      characterName: character.name,
      class1Name: character.class1Name,
      class1Subclass: character.class1Subclass,
      class1Level: character.class1Level,
      class2Name: character.class2Name,
      class2Subclass: character.class2Subclass,
      class2Level: character.class2Level,
      class3Name: character.class3Name,
      class3Subclass: character.class3Subclass,
      class3Level: character.class3Level,
      totalGold: character.totalGold,
      gamesPlayed: character.participants.length,
    }))
    .sort(
      (a, b) =>
        b.gamesPlayed - a.gamesPlayed ||
        a.playerName.localeCompare(b.playerName) ||
        a.characterName.localeCompare(b.characterName)
    );

  const dmUsers = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          gamesCreated: true,
        },
      },
    },
  });

  const dmRoster = dmUsers
    .map((dm) => ({
      id: dm.id,
      name: dm.name,
      gamesLogged: dm._count.gamesCreated,
    }))
    .sort((a, b) => b.gamesLogged - a.gamesLogged || a.name.localeCompare(b.name));

  const openLeagueGames = await prisma.game.findMany({
    where: {
      status: "SCHEDULED",
      datePlayed: {
        gte: new Date(),
      },
    },
    include: {
      dm: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: [{ datePlayed: "asc" }, { title: "asc" }],
  });

  return { handbooks, leaderboard, playerRoster, dmRoster, openLeagueGames };
}

export async function getHandbooks() {
  return prisma.handbook.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function getHandbookBySlug(slug: string) {
  const normalizedSlug =
    slug === "developers-guide" ? "publishers-guide" : slug;

  return prisma.handbook.findUnique({
    where: { slug: normalizedSlug },
  });
}

export async function getLeaguePlayers() {
  return prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: "PLAYER",
        },
      },
    },
    include: {
      characters: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}
