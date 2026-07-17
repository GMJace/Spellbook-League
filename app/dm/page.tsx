// @ts-nocheck
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatStatus, formatTier } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function DmDashboardPage({ searchParams }: PageProps) {
  const user = await requireRole("DM");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const games = await prisma.game.findMany({
    where: {
      dmId: user.id,
      ...(query
        ? {
            OR: [
              {
                title: {
                  contains: query,
                },
              },
              {
                adventureCode: {
                  contains: query,
                },
              },
            ],
          }
        : {}),
    },
    include: {
      participants: true,
    },
    orderBy: { datePlayed: "desc" },
  });

  return (
    <main className="stack">
      <section className="panel">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">DM dashboard</p>
            <h1>Your games</h1>
          </div>
          <div className="inline-actions">
            <Link href="/dm/players" className="button secondary">
              Player roster
            </Link>
            <Link href="/grimoire-gathering" className="button secondary">
              Grimoire page
            </Link>
            <Link href="/dm/achievements" className="button secondary">
              Achievements
            </Link>
            <Link href="/dm/games/new" className="button">
              Create/Log Game
            </Link>
          </div>
        </div>

        <form className="search-row" method="get" style={{ marginTop: "1rem" }}>
          <input
            aria-label="Search games"
            className="input"
            defaultValue={query}
            name="q"
            placeholder="Search by game title or adventure code"
            type="search"
          />
          <button className="button secondary" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="grid two">
        {games.length ? (
          games.map((game) => (
            <article key={game.id} className="list-card dm-game-log-card">
              {game.adventureImagePath ? (
                <img
                  alt={`${game.title} cover art`}
                  className="dm-game-log-image"
                  src={game.adventureImagePath}
                />
              ) : null}
              <div className="inline-actions" style={{ justifyContent: "space-between" }}>
                <h2 style={{ margin: 0 }}>{game.title}</h2>
                <span className="dm-player-count">
                  <span className="dm-player-count-value">{game.participants.length}</span>
                  <span>players</span>
                </span>
              </div>
              <p className="muted">
                {formatDate(game.datePlayed)} | {formatTier(game.tier)} |{" "}
                {formatStatus(game.status)}
              </p>
              <p>{game.adventureCode}</p>
              <Link href={`/dm/games/${game.id}`} className="button secondary">
                View game
              </Link>
            </article>
          ))
        ) : (
          <div className="empty">
            {query ? "No matching games found." : "You have not created any games yet."}
          </div>
        )}
      </section>
    </main>
  );
}
