// @ts-nocheck
import Link from "next/link";

import { CharacterBuildDisplay } from "@/components/character-build-display";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function DmPlayersPage({ searchParams }: PageProps) {
  await requireRole("DM");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const characters = await prisma.character.findMany({
    where: {
      user: {
        roles: {
          some: {
          role: "PLAYER",
          },
        },
      },
      ...(query
        ? {
            OR: [
              {
                name: {
                  contains: query,
                },
              },
              {
                class1Name: {
                  contains: query,
                },
              },
              {
                class1Subclass: {
                  contains: query,
                },
              },
              {
                class2Name: {
                  contains: query,
                },
              },
              {
                class2Subclass: {
                  contains: query,
                },
              },
              {
                class3Name: {
                  contains: query,
                },
              },
              {
                class3Subclass: {
                  contains: query,
                },
              },
              {
                user: {
                  name: {
                    contains: query,
                  },
                },
              },
              {
                user: {
                  email: {
                    contains: query,
                  },
                },
              },
              {
                user: {
                  discordHandle: {
                    contains: query,
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>PLAYER ROSTER</h2>
            <Link className="button secondary" href="/dm">
              Back to DM page
            </Link>
          </div>

          <form
            className="search-row"
            method="get"
          >
            <input
              aria-label="Search players"
              className="input"
              defaultValue={query}
              name="q"
              placeholder="Search players, characters, or classes"
              type="search"
            />
            <button
              className="button button-secondary"
              type="submit"
            >
              Search
            </button>
          </form>

          <div className="table-wrap dm-player-roster-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Discord Handle</th>
                  <th>Character</th>
                  <th>Build</th>
                  <th>Games</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {characters.length ? (
                  characters.map((character) => {
                    return (
                      <tr key={character.id}>
                        <td>{character.user.name}</td>
                        <td>{character.user.discordHandle || "Not provided"}</td>
                        <td>{character.name}</td>
                        <td>
                          <CharacterBuildDisplay character={character} compact />
                        </td>
                        <td>{character._count.participants}</td>
                        <td>
                          <Link
                            className="button button-secondary button-small"
                            href={`/player/characters/${character.id}`}
                          >
                            View record
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="muted" colSpan={6}>
                      No matching players found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
