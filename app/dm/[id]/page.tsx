// @ts-nocheck
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProfileAvatar } from "@/components/profile-avatar";
import { prisma } from "@/lib/prisma";
import { formatDate, formatStatus, formatTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatServiceHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, "");
}

export default async function DmProfilePage({ params }: PageProps) {
  const { id } = await params;

  const dm = await prisma.user.findFirst({
    where: {
      id,
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    include: {
      gamesCreated: {
        include: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
        orderBy: {
          datePlayed: "desc",
        },
      },
    },
  });

  if (!dm) {
    notFound();
  }

  const games = dm.gamesCreated as Array<{
    id: string;
    datePlayed: Date;
    adventureCode: string;
    title: string;
    tier: Parameters<typeof formatTier>[0];
    status: Parameters<typeof formatStatus>[0];
    _count: {
      participants: number;
    };
  }>;
  const totalPlayersHosted = games.reduce(
    (sum, game) => sum + game._count.participants,
    0
  );
  const totalServiceHours = games.reduce(
    (sum, game) => sum + (game.serviceHours ?? 0),
    0
  );

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="section-heading">
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <ProfileAvatar
              name={dm.name}
              src={dm.profileImagePath}
              size={112}
            />
            <div>
              <p className="eyebrow">Dungeon master profile</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>{dm.name}</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                {dm.gamesCreated.length} logged game
                {games.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="button button-secondary" href="/">
              Back
            </Link>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>DM summary</h2>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Games logged
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{games.length}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Players hosted
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{totalPlayersHosted}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Service hours
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {formatServiceHours(totalServiceHours)}
              </p>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Adventure log</h2>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Players</th>
                </tr>
              </thead>
              <tbody>
                {games.length ? (
                  games.map((game) => (
                    <tr key={game.id}>
                      <td>{formatDate(game.datePlayed)}</td>
                      <td>{game.adventureCode}</td>
                      <td>{game.title}</td>
                      <td>{formatTier(game.tier)}</td>
                      <td>{formatStatus(game.status)}</td>
                      <td>{game._count.participants}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={6}>
                      No games logged yet.
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
