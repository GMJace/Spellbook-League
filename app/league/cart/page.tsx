import { auth } from "@/auth";
import { LeagueCartBuilder } from "@/components/league-cart-builder";
import { getCharacterTier, getCharacterTotalLevel } from "@/lib/character";
import { getPayPalClientId } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";
import { isPaidTicketPrice, parseTicketPriceUsd } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{
    games?: string | string[];
  }>;
};

function parseSelectedGames(rawValue: string | string[] | undefined) {
  if (!rawValue) {
    return [];
  }

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export default async function LeagueCartPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  const paypalClientId = getPayPalClientId();
  const [pricedLeagueGames, player] = await Promise.all([
    prisma.game.findMany({
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
    }),
    session?.user?.id
      ? prisma.user.findUnique({
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
              orderBy: {
                name: "asc",
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const cartGames = pricedLeagueGames
    .filter((game) => isPaidTicketPrice(game.ticketPrice))
    .map((game) => ({
      id: game.id,
      title: game.title,
      adventureCode: game.adventureCode,
      datePlayed: game.datePlayed.toISOString(),
      dmName: game.dm?.name ?? game.dmName ?? "SPELLBOOK DM",
      tier: game.tier,
      ticketPrice: game.ticketPrice,
      ticketPriceUsd: parseTicketPriceUsd(game.ticketPrice),
      seatCapacity: game.seatCapacity,
      participantCount: game._count.participants,
    }));
  const playerCharacters =
    player?.characters.map((character) => ({
      id: character.id,
      name: character.name,
      tier: `TIER_${getCharacterTier(getCharacterTotalLevel(character))}` as const,
    })) ?? [];
  const isPlayerSignedIn = Boolean(player?.roles.some((role) => role.role === "PLAYER"));

  return (
    <main className="page-shell">
      <section className="stack">
        {cartGames.length ? (
          <LeagueCartBuilder
            games={cartGames}
            initialSelectedGameIds={parseSelectedGames(resolvedSearchParams.games)}
            isPlayerSignedIn={isPlayerSignedIn}
            paypalClientId={paypalClientId}
            playerCharacters={playerCharacters}
          />
        ) : (
          <div className="empty">No priced league games are available for checkout yet.</div>
        )}
      </section>
    </main>
  );
}
