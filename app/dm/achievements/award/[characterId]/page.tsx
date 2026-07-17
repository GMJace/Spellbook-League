// @ts-nocheck
import Link from "next/link";
import { notFound } from "next/navigation";

import { awardAchievement } from "./actions";
import { AchievementAwardDialog } from "@/components/achievement-award-dialog";
import { CharacterBuildDisplay } from "@/components/character-build-display";
import { requireRole } from "@/lib/auth";
import { getCharacterTier, getCharacterTotalLevel } from "@/lib/character";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    characterId: string;
  }>;
};

export default async function AwardAchievementPage({ params }: PageProps) {
  const currentUser = await requireRole("DM");
  const { characterId } = await params;

  const [character, achievements] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: {
        user: true,
        achievementAwards: {
          include: {
            achievement: true,
            awardedBy: true,
          },
          orderBy: {
            awardedAt: "desc",
          },
        },
      },
    }),
    prisma.achievement.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!character) {
    notFound();
  }

  const availableAchievements = achievements as Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    badgeImagePath: string | null;
  }>;
  const awardHistory = character.achievementAwards as Array<{
    id: string;
    awardedAt: Date;
    gameCode: string | null;
    achievement: {
      name: string;
      badgeImagePath: string | null;
    };
    awardedBy: {
      name: string;
    };
  }>;
  const totalLevel = getCharacterTotalLevel(character);

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DM dashboard</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Award achievement</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                {character.name} by {character.user.name}
              </p>
              <div className="stack" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
                <div>
                  <p className="muted" style={{ margin: 0 }}>
                    Build
                  </p>
                  <div style={{ marginTop: "0.35rem" }}>
                    <CharacterBuildDisplay character={character} compact />
                  </div>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  Tier {getCharacterTier(totalLevel)}
                </p>
              </div>
            </div>
            <Link className="button secondary" href="/dm/achievements">
              Back
            </Link>
          </div>

          {availableAchievements.length ? (
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableAchievements.map((achievement) => (
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
                      <td>
                        <AchievementAwardDialog
                          achievementId={achievement.id}
                          achievementName={achievement.name}
                          awardedByName={currentUser.name}
                          characterId={character.id}
                          characterName={character.name}
                          defaultDate=""
                          playerName={character.user.name}
                          submitAction={awardAchievement}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              No achievements are configured yet. Once you send the achievement list and badges,
              we can wire the actual award form into this page.
            </div>
          )}
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Award history</h2>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Badge</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Game Code</th>
                  <th>Awarded By</th>
                </tr>
              </thead>
              <tbody>
                {awardHistory.length ? (
                  awardHistory.map((award) => (
                    <tr key={award.id}>
                      <td>
                        {award.achievement.badgeImagePath ? (
                          <img
                            alt={`${award.achievement.name} badge`}
                            src={award.achievement.badgeImagePath}
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
                      <td>{award.achievement.name}</td>
                      <td>{formatDate(award.awardedAt)}</td>
                      <td>{award.gameCode || "N/A"}</td>
                      <td>{award.awardedBy.name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={5}>
                      No achievements awarded yet.
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
