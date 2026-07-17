import Link from "next/link";
import { notFound } from "next/navigation";

import { LocalizedEventTime } from "@/components/localized-event-time";
import { formatGrimoireTier } from "@/lib/grimoire";
import { getGrimoireEventById, getMergedGrimoireGameBySlug } from "@/lib/grimoire-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GrimoireGameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const game = await getMergedGrimoireGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const event = await getGrimoireEventById(game.eventId);

  if (!event) {
    notFound();
  }

  const openSeats = Math.max(game.seatCapacity - game.signedUp.length, 0);

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Grimoire Game Detail</p>
            {event.finale ? (
              <span
                className="pill ggcon-event-pill"
                style={{ display: "inline-flex", marginTop: "0.5rem" }}
              >
                Grimoire Gathering Event
              </span>
            ) : null}
            <h1 style={{ margin: "0.35rem 0 0" }}>{game.game}</h1>
            <p className="muted ggcon-meta-note" style={{ margin: "0.5rem 0 0" }}>
              {event.subtitle} · {event.displayDate}
            </p>
          </div>

          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <Link className="button secondary" href="/grimoire-gathering">
              Back to lineup
            </Link>
            {game.ticketPriceUsd > 0 ? (
              <Link
                className="button"
                href={`/grimoire-gathering/cart?games=${encodeURIComponent(game.slug)}`}
              >
                Add ticket to cart
              </Link>
            ) : (
              <span className="button ggcon-button-disabled" aria-disabled="true">
                Ticket pricing coming soon
              </span>
            )}
          </div>
        </div>

        <section className="card ledger-panel ggcon-game-hero-card">
          {game.adventureImagePath ? (
            <img
              alt={`${game.game} adventure cover`}
              className="ggcon-game-cover-image"
              src={game.adventureImagePath}
            />
          ) : (
            <div className="ggcon-game-hero-placeholder">
              <div className="ggcon-game-hero-placeholder-inner">
                <p className="eyebrow" style={{ margin: 0 }}>Adventure Art</p>
                <strong>{game.game}</strong>
                <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                  Image placeholder
                </p>
              </div>
            </div>
          )}

          <div className="stack">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">Game Snapshot</p>
              <p className="ggcon-lead" style={{ margin: 0, maxWidth: "none" }}>
                {game.summary}
              </p>
              {game.gameCode ? (
                <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                  Game code: {game.gameCode}
                </p>
              ) : null}
            </div>

            <div className="ggcon-summary-metrics">
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Ticket</span>
                <strong>{game.ticketPrice}</strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Tier</span>
                <strong>{formatGrimoireTier(game.tier)}</strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Start time</span>
                <strong>
                  <LocalizedEventTime isoString={game.startAt} />
                </strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Dungeon Master</span>
                <strong>{game.dm}</strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Open seats</span>
                <strong>
                  {openSeats} of {game.seatCapacity}
                </strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Waitlist</span>
                <strong>{game.waitlist.length} players</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="card ledger-panel stack">
          <p className="eyebrow">What To Expect</p>
          <ul className="contact-list ggcon-feature-list">
            {game.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </section>

        <div className="grid two ggcon-detail-grid">
          <section className="card ledger-panel stack">
            <div className="section-heading">
              <h2 style={{ margin: 0 }}>Signed Up Players</h2>
            </div>
            <div className="table-wrap ledger-table">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Character</th>
                  </tr>
                </thead>
                <tbody>
                  {game.signedUp.length ? (
                    game.signedUp.map((player) => (
                      <tr key={`${player.name}-${player.character}`}>
                        <td>{player.name}</td>
                        <td>{player.character}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="muted" colSpan={2}>
                        No public signups have been posted for this table yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card ledger-panel stack">
            <div className="section-heading">
              <h2 style={{ margin: 0 }}>Waiting List</h2>
            </div>
            <div className="table-wrap ledger-table">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Character</th>
                  </tr>
                </thead>
                <tbody>
                  {game.waitlist.length ? (
                    game.waitlist.map((player) => (
                      <tr key={`${player.name}-${player.character}`}>
                        <td>{player.name}</td>
                        <td>{player.character}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="muted" colSpan={2}>
                        The waiting list is currently empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
