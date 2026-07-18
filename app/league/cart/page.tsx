import { LeagueCartBuilder } from "@/components/league-cart-builder";
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
  const paypalClientId = getPayPalClientId();
  const pricedLeagueGames = await prisma.game.findMany({
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

  return (
    <main className="page-shell">
      <section className="stack">
        {cartGames.length ? (
          <LeagueCartBuilder
            games={cartGames}
            initialSelectedGameIds={parseSelectedGames(resolvedSearchParams.games)}
            paypalClientId={paypalClientId}
          />
        ) : (
          <div className="empty">No priced league games are available for checkout yet.</div>
        )}
      </section>
    </main>
  );
}
