import Link from "next/link";
import { notFound } from "next/navigation";

import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { getProDmRatingSummary, getProDmReviews } from "@/lib/pro-dm-reviews";
import { getProDmRosterEntry } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";
import { formatDate, formatStarRating, formatStatus, formatTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatServiceHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, "");
}

function splitSpecialties(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function HireADmProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [dm, dmProfile, proDmReviews] = await Promise.all([
    prisma.user.findFirst({
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
    }),
    getProDmRosterEntry(id),
    getProDmReviews(),
  ]);

  if (!dm) {
    notFound();
  }

  const games = dm.gamesCreated as Array<{
    id: string;
    datePlayed: Date;
    adventureCode: string;
    title: string;
    serviceHours: number;
    tier: Parameters<typeof formatTier>[0];
    status: Parameters<typeof formatStatus>[0];
    _count: {
      participants: number;
    };
  }>;
  const profile = dmProfile ?? {
    userId: id,
    isListed: false,
    rating: 5,
    headline: null,
    specialties: null,
    bio: null,
    updatedAt: "",
  };
  const isListed = Boolean(dmProfile?.isListed);
  const totalPlayersHosted = games.reduce((sum, game) => sum + game._count.participants, 0);
  const totalServiceHours = games.reduce((sum, game) => sum + (game.serviceHours ?? 0), 0);
  const specialties = splitSpecialties(profile.specialties);
  const ratingSummary = getProDmRatingSummary(id, profile.rating, proDmReviews);

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">{isListed ? <>Professional <RainbowSpellbook /> DM</> : <><RainbowSpellbook /> DM</>}</p>
              <h1 style={{ margin: 0 }}>{dm.name}</h1>
              <p className="muted" style={{ margin: 0, maxWidth: "62ch" }}>
                {profile.headline ||
                  (isListed ? (
                    <>
                      Professional <RainbowSpellbook /> Dungeon Master available for public
                      bookings.
                    </>
                  ) : (
                    <>
                      <RainbowSpellbook /> Dungeon Master roster profile.
                    </>
                  ))}
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {isListed ? (
                <>
                  <Link className="button" href={`/hire-a-dm/${dm.id}/hire`}>
                    Hire DM
                  </Link>
                  <Link className="button button-secondary" href={`/hire-a-dm/${dm.id}/rate`}>
                    Rate DM
                  </Link>
                </>
              ) : null}
              <Link className="button button-secondary" href="/hire-a-dm">
                Back to roster
              </Link>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Rating
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{formatStarRating(ratingSummary.rating)}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Games logged
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{games.length}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Service hours
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {formatServiceHours(totalServiceHours)}
              </p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Players hosted
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{totalPlayersHosted}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Contact
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {dm.discordHandle || <>Contact <RainbowSpellbook /> for booking details.</>}
              </p>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Profile</h2>
          </div>
          <p style={{ margin: 0 }}>
            {profile.bio ||
              "This DM has not added a public bio yet. Their table history and specialties are still available below."}
          </p>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Specialties</h2>
          </div>

          {specialties.length ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {specialties.map((specialty) => (
                <span key={specialty} className="pill specialty-pill">
                  {specialty}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Specialties have not been listed yet.
            </p>
          )}
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Recent adventure log</h2>
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
