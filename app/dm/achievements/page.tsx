// @ts-nocheck
import Link from "next/link";

import { CharacterBuildDisplay } from "@/components/character-build-display";
import { TableActionMenu } from "@/components/table-action-menu";
import { requireRole } from "@/lib/auth";
import { canViewPrivateCharacterRoster } from "@/lib/character-visibility";
import {
  formatClassSummary,
  getCharacterTier,
  getCharacterTotalLevel,
} from "@/lib/character";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function DmAchievementsPage({ searchParams }: PageProps) {
  const currentUser = await requireRole("DM");
  const canSeePrivateCharacters = await canViewPrivateCharacterRoster(currentUser);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const achievements = await prisma.achievement.findMany({
    include: {
      _count: {
        select: {
          awards: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const characters = await prisma.character.findMany({
    where: {
      ...(canSeePrivateCharacters ? {} : { isPubliclyViewable: true }),
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
            ],
          }
        : {}),
    },
    include: {
      user: true,
      _count: {
        select: {
          participants: true,
          achievementAwards: true,
        },
      },
    },
    orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
  });
  const achievementCatalog = achievements as Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    badgeImagePath: string | null;
    _count: {
      awards: number;
    };
  }>;
  const playerCharacters = characters as Array<{
    id: string;
    name: string;
    class1Name: string;
    class1Subclass: string | null;
    class1Level: number;
    class2Name: string | null;
    class2Subclass: string | null;
    class2Level: number | null;
    class3Name: string | null;
    class3Subclass: string | null;
    class3Level: number | null;
    user: {
      name: string;
    };
    _count: {
      participants: number;
      achievementAwards: number;
    };
  }>;

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DM dashboard</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Achievements</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                Review every achievement that can be awarded to a player character.
              </p>
            </div>
            <Link className="button secondary" href="/dm">
              Back
            </Link>
          </div>

          {achievementCatalog.length ? (
            <div
              className="table-wrap"
              style={{
                maxHeight: "44rem",
                overflowY: "auto",
              }}
            >
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Badge</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Awards</th>
                  </tr>
                </thead>
                <tbody>
                  {achievementCatalog.map((achievement) => (
                    <tr key={achievement.id}>
                      <td>
                        {achievement.badgeImagePath ? (
                          <img
                            alt={`${achievement.name} badge`}
                            src={achievement.badgeImagePath}
                            style={{
                              width: "48px",
                              height: "48px",
                              objectFit: "cover",
                              borderRadius: "14px",
                              border: "1px solid rgba(255, 255, 255, 0.18)",
                            }}
                          />
                        ) : (
                          <span className="pill">No badge</span>
                        )}
                      </td>
                      <td>{achievement.name}</td>
                      <td>{achievement.category}</td>
                      <td>{achievement.description}</td>
                      <td>{achievement._count.awards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              No achievements have been configured yet. Once you send the list and badges, we
              can add them here.
            </div>
          )}
        </div>

        <div className="list-card stack">
          <img
            alt="Player roster divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Award a Player an Achievement</h2>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                Search for a character, then jump into the award flow.
              </p>
            </div>
          </div>

          <form className="search-row" method="get">
            <input
              aria-label="Search players"
              className="input"
              defaultValue={query}
              name="q"
              placeholder="Search players, characters, or classes"
              type="search"
            />
            <button className="button secondary" type="submit">
              Search
            </button>
          </form>

          <div
            className="table-wrap"
            style={{
              maxHeight: "44rem",
              overflowY: "auto",
            }}
          >
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Character</th>
                  <th>Build</th>
                  <th>Tier</th>
                  <th>Games</th>
                  <th>Achievements</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {playerCharacters.length ? (
                  playerCharacters.map((character) => {
                    const totalLevel = getCharacterTotalLevel(character);

                    return (
                      <tr key={character.id}>
                        <td>{character.user.name}</td>
                        <td>{character.name}</td>
                        <td>
                          <CharacterBuildDisplay character={character} compact />
                        </td>
                        <td>Tier {getCharacterTier(totalLevel)}</td>
                        <td>{character._count.participants}</td>
                        <td>{character._count.achievementAwards}</td>
                        <td>
                          <TableActionMenu>
                            <Link
                              className="button secondary button-small"
                              href={`/dm/achievements/award/${character.id}`}
                            >
                              AWARD ACHIEVEMENT
                            </Link>
                          </TableActionMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="muted" colSpan={7}>
                      {query ? "No matching players found." : "No player characters found."}
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
