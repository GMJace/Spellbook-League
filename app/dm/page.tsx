// @ts-nocheck
import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { TableActionMenu } from "@/components/table-action-menu";
import { requireRole } from "@/lib/auth";
import { getProDmRosterEntry } from "@/lib/pro-dm-roster";
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
  const dmName = user.name ?? user.email ?? "Dungeon Master";

  const [dmProfile, gamesPlayedCount, games] = await Promise.all([
    getProDmRosterEntry(user.id),
    prisma.game.count({
      where: {
        dmId: user.id,
        status: "COMPLETED",
      },
    }),
    prisma.game.findMany({
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
    }),
  ]);

  return (
    <main className="stack">
      <section className="card ledger-panel stack">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <ProfileAvatar name={dmName} src={user.profileImagePath} size={96} />
          <div className="stack" style={{ gap: "0.35rem", flex: "1 1 320px" }}>
            <div>
              <p className="eyebrow">DM account</p>
              <h2 style={{ margin: 0 }}>{user.name ?? "Unnamed DM"}</h2>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Your registered DM details and public profile summary.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Display name</span>
            <strong>{user.name ?? "Not provided"}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Discord handle</span>
            <strong>{user.discordHandle || "Not provided"}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Games played</span>
            <strong>{gamesPlayedCount}</strong>
          </div>
        </div>

        <div className="store-line-divider" />

        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: "0.35rem" }}>
            <div>
              <p className="eyebrow">Public profile</p>
              <h2 style={{ margin: 0 }}>Professional DM profile</h2>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              This is the profile players will see if you are added to the public{" "}
              <RainbowSpellbook /> DM roster.
            </p>
          </div>
          <div className="inline-actions">
            <Link href="/profile" className="button secondary">
              Edit profile
            </Link>
            <Link href={`/hire-a-dm/${user.id}`} className="button secondary">
              Preview public page
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Roster status</span>
            <strong>{dmProfile?.isListed ? "Listed publicly" : "Saved privately"}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Headline</span>
            <strong>{dmProfile?.headline ?? "Not provided"}</strong>
          </div>
          <div className="list-card stack" style={{ gap: "0.35rem" }}>
            <span className="muted">Specialties</span>
            <strong>{dmProfile?.specialties ?? "Not provided"}</strong>
          </div>
        </div>

        <div className="list-card stack" style={{ gap: "0.5rem" }}>
          <span className="muted">Public bio</span>
          <p style={{ margin: 0 }}>
            {dmProfile?.bio ??
              "No public DM bio has been added yet. You can add one from your profile page."}
          </p>
        </div>
      </section>

      <img
        alt="DM dashboard divider"
        className="ggcon-table-divider"
        src="/divider4.png"
      />

      <section className="panel">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">DM dashboard</p>
            <h1>Your games</h1>
          </div>
          <TableActionMenu label="DM actions" summarySmall={false}>
            <Link href="/dm/players" className="button button-secondary button-small">
              Player roster
            </Link>
            <Link href="/grimoire-gathering" className="button button-secondary button-small">
              Grimoire page
            </Link>
            <Link href="/dm/achievements" className="button button-secondary button-small">
              Achievements
            </Link>
            <Link href="/dm/games/new" className="button button-small">
              Create/Log Game
            </Link>
          </TableActionMenu>
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
              <div className="stack" style={{ gap: "0.6rem", justifyItems: "start" }}>
                <Link href={`/dm/games/${game.id}`} className="button secondary">
                  View game
                </Link>
                <Link
                  href={`/dm/games/new?duplicateFrom=${encodeURIComponent(game.id)}`}
                  className="button secondary"
                >
                  Duplicate game
                </Link>
              </div>
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
